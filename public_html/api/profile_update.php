<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
$user = require_user();
check_csrf();
$data = json_body();

$db = db();
$stmt = $db->prepare('SELECT status FROM rooms WHERE id = :id');
$stmt->execute([':id' => (int)$user['room_id']]);
$room = $stmt->fetch();
if ($room !== false && $room['status'] === 'drawn' && !(bool)cfg('ALLOW_EDIT_AFTER_DRAW', false)) {
    fail(409, 'ROOM_CLOSED', 'После жеребьёвки анкету изменить нельзя');
}

$wish = v_wish(v_string($data, 'wish', 'wish'));
$link = v_link(v_string($data, 'link', 'link', false));
$alternative = v_alternative(v_string($data, 'alternative', 'alternative', false));

$stmt = $db->prepare('UPDATE users SET wish = :wish, link = :link, alternative = :alternative WHERE id = :id AND room_id = :room');
$stmt->execute([
    ':wish' => $wish,
    ':link' => $link,
    ':alternative' => $alternative,
    ':id' => (int)$user['id'],
    ':room' => (int)$user['room_id'],
]);

$user['wish'] = $wish;
$user['link'] = $link;
$user['alternative'] = $alternative;
ok(['me' => profile_payload($user)]);