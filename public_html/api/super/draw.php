<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();
$roomId = v_int_id($data, 'room_id');

$db = db();
run_draw($db, $roomId);

ok(['status' => 'drawn', 'participants_count' => room_participants_count($db, $roomId)]);