<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
$room = require_room_admin();
check_csrf();
$data = json_body();

if (($data['confirm'] ?? null) !== true) {
    v_fail('confirm', 'Подтвердите проведение жеребьёвки');
}

$db = db();
run_draw($db, (int)$room['id']);

ok([
    'status' => 'drawn',
    'participants_count' => room_participants_count($db, (int)$room['id']),
]);