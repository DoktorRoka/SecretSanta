<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('GET');
$room = require_room_admin();
$roomId = (int)$room['id'];

$db = db();
$stmt = $db->prepare('SELECT id, full_name, group_or_position, contact, created_at FROM users WHERE room_id = :room ORDER BY created_at, id');
$stmt->execute([':room' => $roomId]);
$users = [];
foreach ($stmt->fetchAll() as $row) {
    $users[] = [
        'id' => (int)$row['id'],
        'full_name' => (string)$row['full_name'],
        'group_or_position' => (string)$row['group_or_position'],
        'contact' => (string)$row['contact'],
        'created_at' => (string)$row['created_at'],
    ];
}

ok([
    'room' => [
        'code' => (string)$room['code'],
        'type' => (string)$room['type'],
        'status' => (string)$room['status'],
        'participants_count' => room_participants_count($db, $roomId),
        'min_participants' => max(2, (int)cfg('MIN_PARTICIPANTS', 3)),
    ],
    'users' => $users,
]);