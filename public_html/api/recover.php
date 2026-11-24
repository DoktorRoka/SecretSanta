<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

$rawCode = v_string($data, 'code', 'code');
$rawContact = v_string($data, 'contact', 'contact');
$recovery = v_string($data, 'recovery', 'recovery');
$newPassword = v_string($data, 'new_password', 'new_password');

$ip = client_ip();
$code = v_try_code($rawCode);
$contact = v_contact_normalize($rawContact);
$key = login_fail_key($code ?? mb_strtolower(trim($rawCode)), $contact['login'] ?? mb_strtolower(trim($rawContact)));

// Восстановление — это проверка секрета, поэтому перебор режем как при входе.
rl_check('recover_fail', $key, 5, 900);
rl_check('login_ip', $ip, 20, 900);
rl_check('room_probe', $ip, 15, 600);

$db = db();
$room = false;
if ($code !== null) {
    $stmt = $db->prepare('SELECT id FROM rooms WHERE code = :code');
    $stmt->execute([':code' => $code]);
    $room = $stmt->fetch();
}
if ($room === false) {
    rl_hit_limited('room_probe', $ip, 15, 600);
}

$user = false;
if ($room !== false && $contact !== null) {
    $stmt = $db->prepare('SELECT u.id, u.room_id, u.auth_ver, u.recovery_hash, r.owner_user_id FROM users u JOIN rooms r ON r.id = u.room_id WHERE u.room_id = :room AND u.login = :login');
    $stmt->execute([':room' => (int)$room['id'], ':login' => $contact['login']]);
    $user = $stmt->fetch();
}

// Одинаковый ответ и время, когда участника нет или у него не задано кодовое слово.
$hasRecovery = $user !== false && $user['recovery_hash'] !== null && $user['recovery_hash'] !== '';
$verified = password_verify($recovery, $hasRecovery ? (string)$user['recovery_hash'] : SANTA_DUMMY_HASH);
if (!$hasRecovery || !$verified) {
    rl_hit_limited('recover_fail', $key, 5, 900);
    rl_hit_limited('login_ip', $ip, 20, 900);
    fail(401, 'BAD_CREDENTIALS', 'Неверный код комнаты, контакт или кодовое слово');
}

// У организатора пароль общий с панелью, поэтому к нему та же длина, что при создании.
$isOwner = $user['owner_user_id'] !== null && (int)$user['owner_user_id'] === (int)$user['id'];
v_password($newPassword, $isOwner ? 8 : 4, 'new_password');

$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$manual = begin_write($db);
try {
    $stmt = $db->prepare('UPDATE users SET pass_hash = :hash, must_change_pass = 0, auth_ver = auth_ver + 1 WHERE id = :id AND room_id = :room');
    $stmt->execute([':hash' => $hash, ':id' => (int)$user['id'], ':room' => (int)$user['room_id']]);
    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('recovery update affected ' . $stmt->rowCount() . ' users');
    }
    // Организатор: тот же пароль идёт в панель, а растущий admin_auth_ver
    // гасит ранее выданные сессии организатора. Оба хеша — в одном коммите.
    if ($isOwner) {
        $stmt = $db->prepare('UPDATE rooms SET admin_pass_hash = :hash, admin_auth_ver = admin_auth_ver + 1 WHERE id = :room');
        $stmt->execute([':hash' => $hash, ':room' => (int)$user['room_id']]);
        if ($stmt->rowCount() !== 1) {
            throw new RuntimeException('owner panel hash update affected ' . $stmt->rowCount() . ' rooms');
        }
    }
    commit_write($db, $manual);
} catch (Throwable $e) {
    rollback_write($db, $manual);
    throw $e;
}

rl_clear('recover_fail', $key);
session_regenerate_id(true);
$_SESSION['user'] = ['id' => (int)$user['id'], 'room_id' => (int)$user['room_id'], 'auth_ver' => (int)$user['auth_ver'] + 1];

santa_log('recovery used: room=' . (int)$user['room_id'] . ' user=' . (int)$user['id']);

ok([]);
