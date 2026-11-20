<?php
declare(strict_types=1);

/**
 * Жеребьёвка: один общий цикл, без самоподарков и взаимных пар при n >= 3.
 */
function run_draw(PDO $db, int $roomId): void
{
    $sqlite = strtolower((string)cfg('DB_DRIVER', 'sqlite')) !== 'mysql';
    $now = $sqlite ? "datetime('now')" : 'UTC_TIMESTAMP()';

    if ($sqlite) {
        $db->exec('BEGIN IMMEDIATE');
    } else {
        $db->beginTransaction();
    }

    try {
        $stmt = $db->prepare('SELECT status FROM rooms WHERE id = :id' . ($sqlite ? '' : ' FOR UPDATE'));
        $stmt->execute([':id' => $roomId]);
        $room = $stmt->fetch();
        if ($room === false) {
            throw new ApiException(404, 'NOT_FOUND', 'Комната не найдена');
        }
        if ($room['status'] !== 'open') {
            throw new ConflictException('ROOM_CLOSED', 'Жеребьёвка в этой комнате уже проведена');
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE room_id = :room ORDER BY id');
        $stmt->execute([':room' => $roomId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $count = count($ids);
        $minimum = max(2, (int)cfg('MIN_PARTICIPANTS', 3));
        if ($count < $minimum) {
            throw new ConflictException('NOT_ENOUGH', 'Нужно минимум ' . $minimum . ' участников');
        }

        for ($i = $count - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
        }

        $insert = $db->prepare('INSERT INTO pairs (room_id, giver_id, receiver_id) VALUES (:room, :giver, :receiver)');
        for ($i = 0; $i < $count; $i++) {
            $insert->execute([
                ':room' => $roomId,
                ':giver' => $ids[$i],
                ':receiver' => $ids[($i + 1) % $count],
            ]);
        }

        $update = $db->prepare('UPDATE rooms SET status = \'drawn\', drawn_at = ' . $now . ' WHERE id = :id AND status = \'open\'');
        $update->execute([':id' => $roomId]);
        if ($update->rowCount() !== 1) {
            throw new ConflictException('ROOM_CLOSED', 'Жеребьёвка в этой комнате уже проведена');
        }

        if ($sqlite) {
            $db->exec('COMMIT');
        } else {
            $db->commit();
        }
    } catch (Throwable $e) {
        try {
            if ($sqlite) {
                $db->exec('ROLLBACK');
            } elseif ($db->inTransaction()) {
                $db->rollBack();
            }
        } catch (Throwable $ignored) {
        }
        throw $e;
    }
}

function reset_draw(PDO $db, int $roomId): void
{
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('DELETE FROM pairs WHERE room_id = :room');
        $stmt->execute([':room' => $roomId]);
        $stmt = $db->prepare("UPDATE rooms SET status = 'open', drawn_at = NULL WHERE id = :id");
        $stmt->execute([':id' => $roomId]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}