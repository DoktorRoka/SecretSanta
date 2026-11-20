<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('GET');
require_super();

$stmt = db()->query('SELECT r.id, r.code, r.type, r.status, r.created_at, r.drawn_at, (SELECT COUNT(*) FROM users u WHERE u.room_id = r.id) AS participants_count FROM rooms r ORDER BY r.created_at DESC, r.id DESC');
$rooms = [];
foreach ($stmt->fetchAll() as $row) {
    $rooms[] = [
        'id' => (int)$row['id'],
        'code' => (string)$row['code'],
        'type' => (string)$row['type'],
        'status' => (string)$row['status'],
        'participants_count' => (int)$row['participants_count'],
        'created_at' => (string)$row['created_at'],
        'drawn_at' => $row['drawn_at'] === null ? null : (string)$row['drawn_at'],
    ];
}

ok(['rooms' => $rooms]);