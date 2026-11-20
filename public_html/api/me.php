<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('GET');
$user = require_user(true);

if ((int)$user['must_change_pass'] === 1) {
    ok(['must_change_pass' => true]);
}

$db = db();
$stmt = $db->prepare('SELECT code, type, status FROM rooms WHERE id = :id');
$stmt->execute([':id' => (int)$user['room_id']]);
$room = $stmt->fetch();
$roomId = (int)$user['room_id'];

$recipient = null;
if ($room !== false && $room['status'] === 'drawn') {
    $stmt = $db->prepare('SELECT u.full_name, u.group_or_position, u.contact, u.wish, u.link, u.alternative FROM pairs p JOIN users u ON u.id = p.receiver_id WHERE p.giver_id = :me AND p.room_id = :room');
    $stmt->execute([':me' => (int)$user['id'], ':room' => $roomId]);
    $row = $stmt->fetch();
    $recipient = $row === false ? null : profile_payload($row);
}

ok([
    'must_change_pass' => false,
    'me' => profile_payload($user),
    'room' => [
        'code' => (string)$room['code'],
        'type' => (string)$room['type'],
        'status' => (string)$room['status'],
        'participants_count' => room_participants_count($db, $roomId),
    ],
    'recipient' => $recipient,
]);