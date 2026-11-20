<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();

$roomId = v_int_id($data, 'room_id');
$confirm = v_string($data, 'confirm_code', 'confirm_code');

$stmt = db()->prepare('SELECT code FROM rooms WHERE id = :id');
$stmt->execute([':id' => $roomId]);
$room = $stmt->fetch();
if ($room === false) {
    fail(404, 'NOT_FOUND', 'Комната не найдена');
}
if (mb_strtolower(trim($confirm), 'UTF-8') !== $room['code']) {
    v_fail('confirm_code', 'Код комнаты не совпадает');
}

reset_draw(db(), $roomId);
ok(['status' => 'open']);