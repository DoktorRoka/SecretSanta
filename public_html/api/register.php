<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();

if (!empty($data['website'])) {
    ok([]);
}

rl_hit_limited('register', client_ip(), 10, 3600);
rl_check('room_probe', client_ip(), 15, 600);

$role = v_role($data);
$code = v_code(v_string($data, 'code', 'code'));

$stmt = db()->prepare('SELECT id, code, type, status FROM rooms WHERE code = :code');
$stmt->execute([':code' => $code]);
$room = $stmt->fetch();
if ($room === false) {
    rl_hit_limited('room_probe', client_ip(), 15, 600);
    fail(404, 'ROOM_NOT_FOUND', 'Комната не найдена, проверьте код');
}
if ($room['type'] !== $role) {
    $message = $room['type'] === 'teacher' ? 'Эта комната для преподавателей' : 'Эта комната для студентов';
    fail(409, 'ROOM_TYPE_MISMATCH', $message);
}
if ($room['status'] !== 'open') {
    fail(409, 'ROOM_CLOSED', 'Регистрация в этой комнате уже закрыта');
}

$roomId = (int)$room['id'];
$db = db();
if (room_participants_count($db, $roomId) >= (int)cfg('MAX_USERS_PER_ROOM', 200)) {
    fail(409, 'ROOM_FULL', 'В комнате нет свободных мест');
}

$profile = v_profile(v_object($data, 'profile'), $role, true);
v_consent($data);

$manual = begin_write($db);
try {
    // Перепроверяем статус и ёмкость под блокировкой записи.
    $check = $db->prepare('SELECT status FROM rooms WHERE id = :id');
    $check->execute([':id' => $roomId]);
    if ($check->fetchColumn() !== 'open') {
        throw new ConflictException('ROOM_CLOSED', 'Регистрация в этой комнате уже закрыта');
    }
    if (room_participants_count($db, $roomId) >= (int)cfg('MAX_USERS_PER_ROOM', 200)) {
        throw new ConflictException('ROOM_FULL', 'В комнате нет свободных мест');
    }

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
        ':hash' => password_hash($profile['password'], PASSWORD_DEFAULT),
        ':recovery_hash' => password_hash($profile['recovery'], PASSWORD_DEFAULT),
    ]);
    $userId = (int)$db->lastInsertId();
    commit_write($db, $manual);
} catch (PDOException $e) {
    rollback_write($db, $manual);
    if (is_unique_violation($e)) {
        fail(409, 'LOGIN_TAKEN', 'Этот контакт уже зарегистрирован в комнате — войдите');
    }
    throw $e;
} catch (Throwable $e) {
    rollback_write($db, $manual);
    throw $e;
}

session_regenerate_id(true);
$_SESSION['user'] = ['id' => $userId, 'room_id' => $roomId, 'auth_ver' => 1];

$me = [
    'full_name' => $profile['full_name'],
    'group_or_position' => $profile['group_or_position'],
    'contact' => $profile['contact'],
    'wish' => $profile['wish'],
    'link' => $profile['link'],
    'alternative' => $profile['alternative'],
];

ok(['me' => $me, 'room' => room_public_payload($room)]);