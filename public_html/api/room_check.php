<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
check_csrf();
$data = json_body();
$code = v_code(v_string($data, 'code', 'code'));

rl_check('room_probe', client_ip(), 15, 600);
$stmt = db()->prepare('SELECT type, status FROM rooms WHERE code = :code');
$stmt->execute([':code' => $code]);
$room = $stmt->fetch();

if ($room === false) {
    rl_hit_limited('room_probe', client_ip(), 15, 600);
    fail(404, 'ROOM_NOT_FOUND', 'Комната не найдена, проверьте код');
}
if ($room['status'] !== 'open') {
    rl_hit_limited('room_probe', client_ip(), 15, 600);
    fail(409, 'ROOM_CLOSED', 'Регистрация в этой комнате уже закрыта');
}

ok(['type' => (string)$room['type']]);