<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
$room = require_room_admin();
check_csrf();
$data = json_body();
$userId = v_int_id($data, 'user_id');

$roomId = (int)$room['id'];
if ($room['status'] !== 'open') {
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки сброс ПИН недоступен');
}

$pin = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
// Условие «комната ещё открыта» встроено в сам UPDATE, чтобы проверка и
// запись были одной операцией и не было гонки с жеребьёвкой.
$stmt = db()->prepare(
    'UPDATE users SET pass_hash = :hash, must_change_pass = 1, auth_ver = auth_ver + 1
     WHERE id = :id AND room_id = :room
       AND EXISTS (SELECT 1 FROM rooms r WHERE r.id = users.room_id AND r.status = \'open\')'
);
$stmt->execute([
    ':hash' => password_hash($pin, PASSWORD_DEFAULT),
    ':id' => $userId,
    ':room' => $roomId,
]);

if ($stmt->rowCount() !== 1) {
    $check = db()->prepare('SELECT 1 FROM users WHERE id = :id AND room_id = :room');
    $check->execute([':id' => $userId, ':room' => $roomId]);
    if ($check->fetch() === false) {
        fail(404, 'NOT_FOUND', 'Участник не найден');
    }
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки сброс ПИН недоступен');
}

santa_log('admin pin reset: room=' . $roomId . ' user=' . $userId);

ok(['pin' => $pin]);