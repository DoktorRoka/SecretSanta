<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
$user = require_user(true);
check_csrf();
$data = json_body();

$oldPassword = v_string($data, 'old_password', 'old_password');
$newPassword = v_string($data, 'new_password', 'new_password');

$db = db();
$stmt = $db->prepare('SELECT u.login, u.pass_hash, r.code, r.owner_user_id FROM users u JOIN rooms r ON r.id = u.room_id WHERE u.id = :id AND u.room_id = :room');
$stmt->execute([':id' => (int)$user['id'], ':room' => (int)$user['room_id']]);
$row = $stmt->fetch();
if ($row === false) {
    fail(401, 'UNAUTHORIZED', 'Требуется вход в кабинет');
}

$isOwner = $row['owner_user_id'] !== null && (int)$row['owner_user_id'] === (int)$user['id'];
// У организатора пароль общий с панелью, поэтому и в кабинете держим ту же
// длину, что и при создании комнаты (участнику достаточно 4 символов).
v_password($newPassword, $isOwner ? 8 : 4, 'new_password');
if ($oldPassword === $newPassword) {
    v_fail('new_password', 'Новый пароль должен отличаться от текущего');
}

$key = login_fail_key((string)$row['code'], (string)$row['login']);
rl_check('login_fail', $key, 5, 900);
if (!password_verify($oldPassword, (string)$row['pass_hash'])) {
    rl_hit_limited('login_fail', $key, 5, 900);
    v_fail('old_password', 'Неверный текущий пароль');
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$manual = begin_write($db);
try {
    $stmt = $db->prepare('UPDATE users SET pass_hash = :hash, must_change_pass = 0, auth_ver = auth_ver + 1 WHERE id = :id AND room_id = :room');
    $stmt->execute([
        ':hash' => $hash,
        ':id' => (int)$user['id'],
        ':room' => (int)$user['room_id'],
    ]);

    // У организатора пароль один: сменил в кабинете — сменился и в панели.
    // Оба хеша пишутся одним коммитом, а растущий admin_auth_ver гасит все
    // ранее выданные сессии организатора (старый radmin-cookie перестаёт работать).
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

rl_clear('login_fail', $key);
session_regenerate_id(true);
$_SESSION['user']['auth_ver'] = (int)$user['auth_ver'] + 1;

ok([]);
