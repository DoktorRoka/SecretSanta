<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('POST');
$user = require_user();
check_csrf();
$data = json_body();

$db = db();
$allowEditAfterDraw = (bool)cfg('ALLOW_EDIT_AFTER_DRAW', false);

$wish = v_wish(v_string($data, 'wish', 'wish'));
$link = v_link(v_string($data, 'link', 'link', false));
$alternative = v_alternative(v_string($data, 'alternative', 'alternative', false));

// Условие «комната открыта» в самом UPDATE, чтобы правка не прошла уже
// после жеребьёвки, даже если статус изменился между проверками.
$guard = $allowEditAfterDraw
    ? ''
    : ' AND EXISTS (SELECT 1 FROM rooms r WHERE r.id = users.room_id AND r.status = \'open\')';
$stmt = $db->prepare('UPDATE users SET wish = :wish, link = :link, alternative = :alternative WHERE id = :id AND room_id = :room' . $guard);
$stmt->execute([
    ':wish' => $wish,
    ':link' => $link,
    ':alternative' => $alternative,
    ':id' => (int)$user['id'],
    ':room' => (int)$user['room_id'],
]);

if (!$allowEditAfterDraw && $stmt->rowCount() !== 1) {
    // Либо комната уже разжана, либо менять нечего (MySQL при тех же значениях).
    $check = $db->prepare('SELECT status FROM rooms WHERE id = :id');
    $check->execute([':id' => (int)$user['room_id']]);
    if ($check->fetchColumn() === 'drawn') {
        fail(409, 'ROOM_CLOSED', 'После жеребьёвки анкету изменить нельзя');
    }
}

$user['wish'] = $wish;
$user['link'] = $link;
$user['alternative'] = $alternative;
ok(['me' => profile_payload($user)]);