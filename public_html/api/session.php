<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

require_method('GET');

ok([
    'csrf' => csrf_token(),
    'user' => current_user() !== null,
    'radmin' => current_admin() !== null,
    'super' => current_super(),
]);