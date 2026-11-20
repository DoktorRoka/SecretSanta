<?php
declare(strict_types=1);

/**
 * Rate-limit на таблице rate_limits.
 */

function rl_check(string $bucket, string $ident, int $limit, int $window): void
{
    $stmt = db()->prepare('SELECT COUNT(*) AS total, MIN(created_at) AS oldest FROM rate_limits WHERE bucket = :bucket AND ident = :ident AND created_at > :since');
    $stmt->execute([':bucket' => $bucket, ':ident' => $ident, ':since' => time() - $window]);
    $row = $stmt->fetch();
    if ($row === false || (int)$row['total'] < $limit) {
        return;
    }
    $retry = max(1, (int)$row['oldest'] + $window - time());
    header('Retry-After: ' . $retry);
    fail(429, 'RATE_LIMIT', 'Слишком много попыток, подождите несколько минут');
}

function rl_hit(string $bucket, string $ident): void
{
    $stmt = db()->prepare('INSERT INTO rate_limits (bucket, ident, created_at) VALUES (:bucket, :ident, :at)');
    $stmt->execute([':bucket' => $bucket, ':ident' => $ident, ':at' => time()]);
    if (random_int(1, 100) === 1) {
        $cleanup = db()->prepare('DELETE FROM rate_limits WHERE created_at < :since');
        $cleanup->execute([':since' => time() - 86400]);
    }
}

function rl_clear(string $bucket, string $ident): void
{
    $stmt = db()->prepare('DELETE FROM rate_limits WHERE bucket = :bucket AND ident = :ident');
    $stmt->execute([':bucket' => $bucket, ':ident' => $ident]);
}

function login_fail_key(string $code, string $login): string
{
    return sha1($code . '|' . $login . '|' . client_ip());
}