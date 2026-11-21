<?php
declare(strict_types=1);

/**
 * Rate-limit на таблице rate_limits.
 */

function rl_fail(string $bucket, string $ident, int $since, int $window): void
{
    $stmt = db()->prepare('SELECT MIN(created_at) AS oldest FROM rate_limits WHERE bucket = :bucket AND ident = :ident AND created_at > :since');
    $stmt->execute([':bucket' => $bucket, ':ident' => $ident, ':since' => $since]);
    $row = $stmt->fetch();
    $oldest = ($row === false || $row['oldest'] === null) ? time() : (int)$row['oldest'];
    $retry = max(1, $oldest + $window - time());
    header('Retry-After: ' . $retry);
    fail(429, 'RATE_LIMIT', 'Слишком много попыток, подождите несколько минут');
}

function rl_check(string $bucket, string $ident, int $limit, int $window): void
{
    $since = time() - $window;
    $stmt = db()->prepare('SELECT COUNT(*) AS total FROM rate_limits WHERE bucket = :bucket AND ident = :ident AND created_at > :since');
    $stmt->execute([':bucket' => $bucket, ':ident' => $ident, ':since' => $since]);
    $row = $stmt->fetch();
    if ($row === false || (int)$row['total'] < $limit) {
        return;
    }
    rl_fail($bucket, $ident, $since, $window);
}

/**
 * Атомарно учитывает попытку одним запросом: вставляет запись только если
 * лимит ещё не достигнут. Заменяет пары rl_check()+rl_hit(), убирая гонку
 * «проверил → изменил». При превышении отвечает 429.
 */
function rl_hit_limited(string $bucket, string $ident, int $limit, int $window): void
{
    $now = time();
    $since = $now - $window;
    $stmt = db()->prepare(
        'INSERT INTO rate_limits (bucket, ident, created_at)
         SELECT :bucket, :ident, :at FROM (SELECT 1) AS dummy
         WHERE (SELECT COUNT(*) FROM rate_limits WHERE bucket = :bucket2 AND ident = :ident2 AND created_at > :since) < :limit'
    );
    $stmt->bindValue(':bucket', $bucket);
    $stmt->bindValue(':ident', $ident);
    $stmt->bindValue(':at', $now, PDO::PARAM_INT);
    $stmt->bindValue(':bucket2', $bucket);
    $stmt->bindValue(':ident2', $ident);
    $stmt->bindValue(':since', $since, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        rl_fail($bucket, $ident, $since, $window);
    }

    if (random_int(1, 100) === 1) {
        $cleanup = db()->prepare('DELETE FROM rate_limits WHERE created_at < :since');
        $cleanup->execute([':since' => $now - 86400]);
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