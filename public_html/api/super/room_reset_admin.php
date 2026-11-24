<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();
$roomId = v_int_id($data, 'room_id');

$db = db();
$exists = $db->prepare('SELECT id, owner_user_id FROM rooms WHERE id = :id');
$exists->execute([':id' => $roomId]);
$room = $exists->fetch();
if ($room === false) {
    fail(404, 'NOT_FOUND', 'Комната не найдена');
}

$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
$password = '';
for ($i = 0; $i < 10; $i++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}
$hash = password_hash($password, PASSWORD_DEFAULT);

$manual = begin_write($db);
try {
    $stmt = $db->prepare('UPDATE rooms SET admin_pass_hash = :hash, admin_auth_ver = admin_auth_ver + 1 WHERE id = :id');
    $stmt->execute([':hash' => $hash, ':id' => $roomId]);
    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('room disappeared during admin reset');
    }

    // У организатора пароль общий для панели и кабинета — меняем оба места
    // одним коммитом, чтобы хеши не разошлись при сбое между запросами.
    if ($room['owner_user_id'] !== null) {
        $stmt = $db->prepare('UPDATE users SET pass_hash = :hash, auth_ver = auth_ver + 1 WHERE id = :owner AND room_id = :room');
        $stmt->execute([':hash' => $hash, ':owner' => (int)$room['owner_user_id'], ':room' => $roomId]);
        if ($stmt->rowCount() !== 1) {
            // Владелец удалён: связь «панель ↔ кабинет» обнуляем, панельный
            // пароль всё равно сменился. Логируем расхождение.
            $db->prepare('UPDATE rooms SET owner_user_id = NULL WHERE id = :id')->execute([':id' => $roomId]);
            santa_log('super admin reset: dangling owner_user_id cleared for room=' . $roomId);
        }
    }
    commit_write($db, $manual);
} catch (Throwable $e) {
    rollback_write($db, $manual);
    throw $e;
}

ok(['password' => $password]);
