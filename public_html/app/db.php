<?php
declare(strict_types=1);

/**
 * PDO-подключение и автосоздание схемы.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $driver = strtolower((string)cfg('DB_DRIVER', 'sqlite'));
    if ($driver === 'mysql') {
        $pdo = new PDO(
            (string)cfg('DB_DSN', ''),
            (string)cfg('DB_USER', ''),
            (string)cfg('DB_PASS', ''),
            $options
        );
        $pdo->exec('SET NAMES utf8mb4');
        $pdo->exec("SET time_zone = '+00:00'");
        $exists = $pdo->query("SHOW TABLES LIKE 'rooms'")->fetchColumn();
        if ($exists === false) {
            db_run_schema($pdo, SANTA_APP . '/schema_mysql.sql');
        }
        return $pdo;
    }

    $path = (string)cfg('DB_PATH', SANTA_DATA . DIRECTORY_SEPARATOR . 'santa.sqlite');
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $pdo = new PDO('sqlite:' . $path, null, null, $options);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    try {
        $pdo->exec('PRAGMA journal_mode = WAL');
    } catch (Throwable $e) {
        // Остаёмся на журнале DELETE — это допустимо.
    }

    $exists = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'")->fetchColumn();
    if ($exists === false) {
        db_run_schema($pdo, SANTA_APP . '/schema.sql');
    }
    $pdo->exec('PRAGMA foreign_keys = ON');
    return $pdo;
}

function db_run_schema(PDO $pdo, string $file): void
{
    $sql = @file_get_contents($file);
    if ($sql === false || trim($sql) === '') {
        throw new RuntimeException('Schema file is missing: ' . basename($file));
    }
    $pdo->exec($sql);
}

function is_unique_violation(PDOException $e): bool
{
    $message = $e->getMessage();
    return strpos($message, 'UNIQUE constraint failed') !== false
        || strpos($message, 'Duplicate entry') !== false
        || strpos($message, '1062') !== false;
}

/**
 * Начинает транзакцию записи. Для SQLite — BEGIN IMMEDIATE: он сразу берёт
 * блокировку записи, поэтому проверка ёмкости перед вставкой становится
 * атомарной. Возвращает true, когда транзакция начата вручную через exec().
 */
function begin_write(PDO $db): bool
{
    if (strtolower((string)cfg('DB_DRIVER', 'sqlite')) === 'mysql') {
        $db->beginTransaction();
        return false;
    }
    $db->exec('BEGIN IMMEDIATE');
    return true;
}

function commit_write(PDO $db, bool $manual): void
{
    if ($manual) {
        $db->exec('COMMIT');
    } else {
        $db->commit();
    }
}

function rollback_write(PDO $db, bool $manual): void
{
    try {
        if ($manual) {
            $db->exec('ROLLBACK');
        } elseif ($db->inTransaction()) {
            $db->rollBack();
        }
    } catch (Throwable $ignored) {
    }
}

function room_participants_count(PDO $db, int $roomId): int
{
    $stmt = $db->prepare('SELECT COUNT(*) FROM users WHERE room_id = :room');
    $stmt->execute([':room' => $roomId]);
    return (int)$stmt->fetchColumn();
}

function room_public_payload(array $room): array
{
    return [
        'code' => (string)$room['code'],
        'type' => (string)$room['type'],
        'status' => (string)$room['status'],
    ];
}