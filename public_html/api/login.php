<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

$rawCode = v_string($data, 'code', 'code');
$rawContact = v_string($data, 'contact', 'contact');
$password = v_string($data, 'password', 'password');

$ip = client_ip();
$code = v_try_code($rawCode);
$contact = v_contact_normalize($rawContact);
$key = login_fail_key($code ?? mb_strtolower(trim($rawCode)), $contact['login'] ?? mb_strtolower(trim($rawContact)));

rl_check('login_ip', $ip, 20, 900);
rl_check('login_fail', $key, 5, 900);
rl_check('room_probe', $ip, 15, 600);

$db = db();
$room = false;
if ($code !== null) {
    $stmt = $db->prepare('SELECT id FROM rooms WHERE code = :code');
    $stmt->execute([':code' => $code]);
    $room = $stmt->fetch();
}
if ($room === false) {
    rl_hit('room_probe', $ip);
}

$user = false;
if ($room !== false && $contact !== null) {
    $stmt = $db->prepare('SELECT id, room_id, pass_hash, auth_ver, must_change_pass FROM users WHERE room_id = :room AND login = :login');
    $stmt->execute([':room' => (int)$room['id'], ':login' => $contact['login']]);
    $user = $stmt->fetch();
}

// Одинаковый ответ и одинаковое время для «нет пользователя» и «неверный пароль».
$verified = password_verify($password, $user === false ? SANTA_DUMMY_HASH : $user['pass_hash']);
if ($user === false || !$verified) {
    rl_hit('login_fail', $key);
    rl_hit('login_ip', $ip);
    fail(401, 'BAD_CREDENTIALS', 'Неверный код комнаты, контакт или пароль');
}

rl_clear('login_fail', $key);
session_regenerate_id(true);
$_SESSION['user'] = ['id' => (int)$user['id'], 'room_id' => (int)$user['room_id'], 'auth_ver' => (int)$user['auth_ver']];

ok(['must_change_pass' => (int)$user['must_change_pass'] === 1]);