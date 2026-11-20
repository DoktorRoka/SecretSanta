<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
$room = require_room_admin();
check_csrf();
$data = json_body();
$userId = v_int_id($data, 'user_id');

$pin = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$stmt = db()->prepare('UPDATE users SET pass_hash = :hash, must_change_pass = 1, auth_ver = auth_ver + 1 WHERE id = :id AND room_id = :room');
$stmt->execute([
    ':hash' => password_hash($pin, PASSWORD_DEFAULT),
    ':id' => $userId,
    ':room' => (int)$room['id'],
]);

if ($stmt->rowCount() !== 1) {
    fail(404, 'NOT_FOUND', 'Участник не найден');
}

ok(['pin' => $pin]);