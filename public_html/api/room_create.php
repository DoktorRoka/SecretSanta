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

rl_hit_limited('room_create', client_ip(), 5, 3600);

$role = v_role($data);
$code = v_code(v_string($data, 'code', 'code'));
// Один пароль организатора: он же служит паролем входа в его кабинет.
$password = v_password(v_string($data, 'admin_password', 'admin_password'), 8, 'admin_password');
$profile = v_profile(v_object($data, 'profile'), $role, false);
v_consent($data);

$db = db();
$manual = begin_write($db);
try {
    // Проверка лимита под блокировкой записи, чтобы параллельные создания
    // не обошли MAX_ROOMS.
    $total = (int)$db->query('SELECT COUNT(*) FROM rooms')->fetchColumn();
    if ($total >= (int)cfg('MAX_ROOMS', 300)) {
        throw new ConflictException('ROOM_LIMIT', 'Достигнут лимит комнат, попробуйте позже');
    }

    // Один и тот же хеш идёт и в панель организатора, и в его кабинет.
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO rooms (code, type, admin_pass_hash) VALUES (:code, :type, :hash)');
    $stmt->execute([
        ':code' => $code,
        ':type' => $role,
        ':hash' => $hash,
    ]);
    $roomId = (int)$db->lastInsertId();
    $stmt = $db->prepare('INSERT INTO users (room_id, login, contact, full_name, group_or_position, wish, link, alternative, pass_hash, recovery_hash) VALUES (:room, :login, :contact, :full_name, :group_or_position, :wish, :link, :alternative, :hash, :recovery_hash)');
    $stmt->execute([
        ':room' => $roomId,
        ':login' => $profile['login'],
        ':contact' => $profile['contact'],
        ':full_name' => $profile['full_name'],
        ':group_or_position' => $profile['group_or_position'],
        ':wish' => $profile['wish'],
        ':link' => $profile['link'],
        ':alternative' => $profile['alternative'],
        ':hash' => $hash,
        ':recovery_hash' => password_hash($profile['recovery'], PASSWORD_DEFAULT),
    ]);
    $userId = (int)$db->lastInsertId();
    // Запоминаем организатора: по нему пароль панели и кабинета держим общим.
    $stmt = $db->prepare('UPDATE rooms SET owner_user_id = :owner WHERE id = :room');
    $stmt->execute([':owner' => $userId, ':room' => $roomId]);
    commit_write($db, $manual);
} catch (PDOException $e) {
    rollback_write($db, $manual);
    if (is_unique_violation($e)) {
        fail(409, 'ROOM_EXISTS', 'Такой код уже занят, придумайте другой');
    }
    throw $e;
} catch (Throwable $e) {
    rollback_write($db, $manual);
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