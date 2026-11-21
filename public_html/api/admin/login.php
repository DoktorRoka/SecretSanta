<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

$rawCode = v_string($data, 'code', 'code');
$password = v_string($data, 'password', 'password');
$ip = client_ip();
$ident = sha1(mb_strtolower(trim($rawCode)) . '|' . $ip);

rl_check('room_probe', $ip, 15, 600);
rl_check('admin_fail', $ident, 5, 900);

$code = v_try_code($rawCode);
$room = false;
if ($code !== null) {
    $stmt = db()->prepare('SELECT id, code, type, status, admin_pass_hash, admin_auth_ver FROM rooms WHERE code = :code');
    $stmt->execute([':code' => $code]);
    $room = $stmt->fetch();
}

$verified = password_verify($password, $room === false ? SANTA_DUMMY_HASH : (string)$room['admin_pass_hash']);
if ($room === false || !$verified) {
    rl_hit_limited('admin_fail', $ident, 5, 900);
    if ($room === false) {
        rl_hit_limited('room_probe', $ip, 15, 600);
    }
    fail(401, 'BAD_CREDENTIALS', 'Неверный код комнаты или пароль организатора');
}

rl_clear('admin_fail', $ident);
session_regenerate_id(true);
$_SESSION['radmin'] = ['room_id' => (int)$room['id'], 'auth_ver' => (int)$room['admin_auth_ver']];

ok(['room' => room_public_payload($room)]);