<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
$room = require_room_admin();
check_csrf();
$data = json_body();

if ($room['status'] !== 'open') {
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки удалять участников нельзя');
}
$userId = v_int_id($data, 'user_id');

$db = db();
$stmt = $db->prepare('DELETE FROM users WHERE id = :id AND room_id = :room');
$stmt->execute([':id' => $userId, ':room' => (int)$room['id']]);
if ($stmt->rowCount() !== 1) {
    fail(404, 'NOT_FOUND', 'Участник не найден');
}

if (isset($_SESSION['user']['id']) && (int)$_SESSION['user']['id'] === $userId) {
    unset($_SESSION['user']);
}

ok(['participants_count' => room_participants_count($db, (int)$room['id'])]);