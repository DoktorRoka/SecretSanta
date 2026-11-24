<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
$room = require_room_admin();
check_csrf();
$data = json_body();
$userId = v_int_id($data, 'user_id');

$roomId = (int)$room['id'];
if ($room['status'] !== 'open') {
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки сброс ПИН недоступен');
}

$db = db();
$ownerStmt = $db->prepare('SELECT owner_user_id FROM rooms WHERE id = :id');
$ownerStmt->execute([':id' => $roomId]);
$ownerId = $ownerStmt->fetchColumn();
$isOwner = $ownerId !== null && (int)$ownerId === $userId;

$pin = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$hash = password_hash($pin, PASSWORD_DEFAULT);

$manual = begin_write($db);
try {
    // Условие «комната ещё открыта» встроено в сам UPDATE, чтобы проверка и
    // запись были одной операцией и не было гонки с жеребьёвкой.
    $stmt = $db->prepare(
        'UPDATE users SET pass_hash = :hash, must_change_pass = 1, auth_ver = auth_ver + 1
         WHERE id = :id AND room_id = :room
           AND EXISTS (SELECT 1 FROM rooms r WHERE r.id = users.room_id AND r.status = \'open\')'
    );
    $stmt->execute([
        ':hash' => $hash,
        ':id' => $userId,
        ':room' => $roomId,
    ]);

    if ($stmt->rowCount() !== 1) {
        $check = $db->prepare('SELECT 1 FROM users WHERE id = :id AND room_id = :room');
        $check->execute([':id' => $userId, ':room' => $roomId]);
        if ($check->fetch() === false) {
            throw new ApiException(404, 'NOT_FOUND', 'Участник не найден');
        }
        throw new ConflictException('ROOM_CLOSED', 'После жеребьёвки сброс ПИН недоступен');
    }

    // ПИН организатора совпадает с паролем панели: обновляем и её, и гасим
    // ранее выданные сессии организатора. Оба хеша — в одном коммите.
    if ($isOwner) {
        $stmt = $db->prepare('UPDATE rooms SET admin_pass_hash = :hash, admin_auth_ver = admin_auth_ver + 1 WHERE id = :room');
        $stmt->execute([':hash' => $hash, ':room' => $roomId]);
        if ($stmt->rowCount() !== 1) {
            throw new RuntimeException('owner panel hash update affected ' . $stmt->rowCount() . ' rooms');
        }
    }

    commit_write($db, $manual);
} catch (Throwable $e) {
    rollback_write($db, $manual);
    throw $e;
}

santa_log('admin pin reset: room=' . $roomId . ' user=' . $userId);

ok(['pin' => $pin]);
