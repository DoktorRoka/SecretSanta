<?php
declare(strict_types=1);

require __DIR__ . '/../../app/bootstrap.php';

require_method('POST');
require_super();
check_csrf();
$data = json_body();

if (($data['confirm'] ?? null) !== 'УДАЛИТЬ ВСЁ') {
    v_fail('confirm', 'Введите УДАЛИТЬ ВСЁ, чтобы подтвердить');
}

$db = db();
$db->beginTransaction();
try {
    $db->exec('DELETE FROM pairs');
    $db->exec('DELETE FROM users');
    $db->exec('DELETE FROM rooms');
    $db->exec('DELETE FROM rate_limits');
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    throw $e;
}

ok([]);