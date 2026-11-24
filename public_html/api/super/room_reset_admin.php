<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();
$roomId = v_int_id($data, 'room_id');

$db = db();
$exists = $db->prepare('SELECT id FROM rooms WHERE id = :id');
$exists->execute([':id' => $roomId]);
if ($exists->fetch() === false) {
    fail(404, 'NOT_FOUND', 'Комната не найдена');
}

$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
$password = '';
for ($i = 0; $i < 10; $i++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}
$hash = password_hash($password, PASSWORD_DEFAULT);

$manual = begin_write($db);
try {
    // Меняем ТОЛЬКО пароль панели организатора: суперадмин не должен получать
    // пароль кабинета (он же пароль участника-организатора), иначе он смог бы
    // войти под участником и увидеть его пару. Кабинет участник восстанавливает
    // сам по кодовому слову, а панель при этом продолжает работать по новому паролю.
    $stmt = $db->prepare('UPDATE rooms SET admin_pass_hash = :hash, admin_auth_ver = admin_auth_ver + 1 WHERE id = :id');
    $stmt->execute([':hash' => $hash, ':id' => $roomId]);
    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('room disappeared during admin reset');
    }
    commit_write($db, $manual);
} catch (Throwable $e) {
    rollback_write($db, $manual);
    throw $e;
}

santa_log('super admin panel reset: room=' . $roomId);

ok(['password' => $password]);
