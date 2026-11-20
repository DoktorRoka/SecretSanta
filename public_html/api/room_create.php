<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

// Honeypot: бот получает «успех», но ничего не записывается.
if (!empty($data['website'])) {
    ok([]);
}

rl_check('room_create', client_ip(), 5, 3600);
rl_hit('room_create', client_ip());

$role = v_role($data);
$code = v_code(v_string($data, 'code', 'code'));
$adminPassword = v_password(v_string($data, 'admin_password', 'admin_password'), 8, 'admin_password');
$profile = v_profile(v_object($data, 'profile'), $role, true);
v_consent($data);

$db = db();
$total = (int)$db->query('SELECT COUNT(*) FROM rooms')->fetchColumn();
if ($total >= (int)cfg('MAX_ROOMS', 300)) {
    fail(409, 'ROOM_LIMIT', 'Достигнут лимит комнат, попробуйте позже');
}

try {
    $db->beginTransaction();
    $stmt = $db->prepare('INSERT INTO rooms (code, type, admin_pass_hash) VALUES (:code, :type, :hash)');
    $stmt->execute([
        ':code' => $code,
        ':type' => $role,
        ':hash' => password_hash($adminPassword, PASSWORD_DEFAULT),
    ]);
    $roomId = (int)$db->lastInsertId();
    $stmt = $db->prepare('INSERT INTO users (room_id, login, contact, full_name, group_or_position, wish, link, alternative, pass_hash) VALUES (:room, :login, :contact, :full_name, :group_or_position, :wish, :link, :alternative, :hash)');
    $stmt->execute([
        ':room' => $roomId,
        ':login' => $profile['login'],
        ':contact' => $profile['contact'],
        ':full_name' => $profile['full_name'],
        ':group_or_position' => $profile['group_or_position'],
        ':wish' => $profile['wish'],
        ':link' => $profile['link'],
        ':alternative' => $profile['alternative'],
        ':hash' => password_hash($profile['password'], PASSWORD_DEFAULT),
    ]);
    $userId = (int)$db->lastInsertId();
    $db->commit();
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    if (is_unique_violation($e)) {
        fail(409, 'ROOM_EXISTS', 'Такой код уже занят, придумайте другой');
    }
    throw $e;
}

session_regenerate_id(true);
$_SESSION['user'] = ['id' => $userId, 'room_id' => $roomId, 'auth_ver' => 1];
$_SESSION['radmin'] = ['room_id' => $roomId, 'auth_ver' => 1];

$me = [
    'full_name' => $profile['full_name'],
    'group_or_position' => $profile['group_or_position'],
    'contact' => $profile['contact'],
    'wish' => $profile['wish'],
    'link' => $profile['link'],
    'alternative' => $profile['alternative'],
];

ok(['me' => $me, 'room' => ['code' => $code, 'type' => $role, 'status' => 'open'], 'is_admin' => true]);