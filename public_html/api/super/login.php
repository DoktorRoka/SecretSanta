<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

$hash = (string)cfg('SUPERADMIN_HASH', '');
$validHash = preg_match('/^\$2[aby]\$\d{2}\$[A-Za-z0-9.\/]{53}$/', $hash) === 1
    || preg_match('/^\$argon2(id|i|d)\$/', $hash) === 1;
if (!$validHash) {
    fail(403, 'FORBIDDEN', 'Панель суперадминистратора отключена');
}

$password = v_string($data, 'password', 'password');
$ip = client_ip();
rl_check('super_fail', $ip, 5, 900);
if (!password_verify($password, $hash)) {
    rl_hit_limited('super_fail', $ip, 5, 900);
    fail(401, 'BAD_CREDENTIALS', 'Неверный пароль суперадминистратора');
}

rl_clear('super_fail', $ip);
session_regenerate_id(true);
$_SESSION['super'] = ['at' => time()];

ok([]);