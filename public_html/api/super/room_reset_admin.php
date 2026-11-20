<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();
$roomId = v_int_id($data, 'room_id');

$exists = db()->prepare('SELECT id FROM rooms WHERE id = :id');
$exists->execute([':id' => $roomId]);
if ($exists->fetch() === false) {
    fail(404, 'NOT_FOUND', 'Комната не найдена');
}

$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
$password = '';
for ($i = 0; $i < 10; $i++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}

$stmt = db()->prepare('UPDATE rooms SET admin_pass_hash = :hash, admin_auth_ver = admin_auth_ver + 1 WHERE id = :id');
$stmt->execute([':hash' => password_hash($password, PASSWORD_DEFAULT), ':id' => $roomId]);

ok(['password' => $password]);