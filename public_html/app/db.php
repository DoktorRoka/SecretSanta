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
        } else {
            db_ensure_columns($pdo);
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
    } else {
        db_ensure_columns($pdo);
    }
    $pdo->exec('PRAGMA foreign_keys = ON');
    return $pdo;
}

/**
 * Лёгкая миграция уже существующей БД: добавляет колонки, появившиеся после
 * первой установки, чтобы обновление не требовало пересоздания файла.
 */
function db_ensure_columns(PDO $pdo): void
{
    $driver = strtolower((string)cfg('DB_DRIVER', 'sqlite'));
    if ($driver === 'mysql') {
        $exists = $pdo->query("SHOW COLUMNS FROM rooms LIKE 'owner_user_id'")->fetchColumn();
        if ($exists === false) {
            try {
                $pdo->exec('ALTER TABLE rooms ADD COLUMN owner_user_id INT UNSIGNED NULL');
            } catch (PDOException $e) {
                // Параллельный запрос мог добавить колонку первым — тогда это не ошибка.
                if ($pdo->query("SHOW COLUMNS FROM rooms LIKE 'owner_user_id'")->fetchColumn() === false) {
                    throw $e;
                }
            }
        }
        // Комнаты до обновления: владельцем считаем первого участника — именно
        // он создаётся вместе с комнатой, поэтому единый пароль снова работает.
        $pdo->exec('UPDATE rooms SET owner_user_id = (SELECT MIN(u.id) FROM users u WHERE u.room_id = rooms.id) WHERE owner_user_id IS NULL');

        $exists = $pdo->query("SHOW COLUMNS FROM users LIKE 'recovery_hash'")->fetchColumn();
        if ($exists === false) {
            try {
                $pdo->exec('ALTER TABLE users ADD COLUMN recovery_hash VARCHAR(255) NULL');
            } catch (PDOException $e) {
                if ($pdo->query("SHOW COLUMNS FROM users LIKE 'recovery_hash'")->fetchColumn() === false) {
                    throw $e;
                }
            }
        }
        return;
    }
    $columns = $pdo->query('PRAGMA table_info(rooms)')->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('owner_user_id', $columns, true)) {
        try {
            $pdo->exec('ALTER TABLE rooms ADD COLUMN owner_user_id INTEGER');
        } catch (PDOException $e) {
            // Параллельный запрос мог добавить колонку первым — тогда это не ошибка.
            $now = $pdo->query('PRAGMA table_info(rooms)')->fetchAll(PDO::FETCH_COLUMN, 1);
            if (!in_array('owner_user_id', $now, true)) {
                throw $e;
            }
        }
    }
    // Комнаты до обновления: владельцем считаем первого участника — именно он
    // создаётся вместе с комнатой, поэтому единый пароль снова работает.
    $pdo->exec(
        'UPDATE rooms SET owner_user_id = (SELECT MIN(u.id) FROM users u WHERE u.room_id = rooms.id)
         WHERE owner_user_id IS NULL
           AND EXISTS (SELECT 1 FROM users u2 WHERE u2.room_id = rooms.id)'
    );

    // Кодовое слово самообслуживания: у старых участников его нет (NULL) —
    // восстановление для них недоступно, нужна повторная регистрация.
    $userColumns = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('recovery_hash', $userColumns, true)) {
        try {
            $pdo->exec('ALTER TABLE users ADD COLUMN recovery_hash TEXT');
        } catch (PDOException $e) {
            // Параллельный запрос мог добавить колонку первым — тогда это не ошибка.
            $nowUser = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_COLUMN, 1);
            if (!in_array('recovery_hash', $nowUser, true)) {
                throw $e;
            }
        }
    }
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