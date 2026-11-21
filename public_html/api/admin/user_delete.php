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
$roomId = (int)$room['id'];
// Условие «комната открыта» в самом DELETE — иначе между проверкой и
// удалением могла пройти жеребьёвка.
$stmt = $db->prepare(
    'DELETE FROM users WHERE id = :id AND room_id = :room
       AND EXISTS (SELECT 1 FROM rooms r WHERE r.id = users.room_id AND r.status = \'open\')'
);
$stmt->execute([':id' => $userId, ':room' => $roomId]);
if ($stmt->rowCount() !== 1) {
    $check = $db->prepare('SELECT 1 FROM users WHERE id = :id AND room_id = :room');
    $check->execute([':id' => $userId, ':room' => $roomId]);
    if ($check->fetch() === false) {
        fail(404, 'NOT_FOUND', 'Участник не найден');
    }
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки удалять участников нельзя');
}

if (isset($_SESSION['user']['id']) && (int)$_SESSION['user']['id'] === $userId) {
    unset($_SESSION['user']);
}

ok(['participants_count' => room_participants_count($db, (int)$room['id'])]);