<?php
/**
 * Шаблон конфигурации. Скопируйте в config.php и заполните значения.
 * config.php НЕ должен попадать в репозиторий.
 */

$config = [
    // 'sqlite' (основной вариант) или 'mysql' (опционально).
    'DB_DRIVER' => 'sqlite',

    // Путь к файлу SQLite. Лучше вынести за пределы корня сайта.
    'DB_PATH' => __DIR__ . '/data/santa.sqlite',

    // Только для MySQL:
    'DB_DSN'  => 'mysql:host=localhost;dbname=santa;charset=utf8mb4',
    'DB_USER' => 'santa',
    'DB_PASS' => '',

    // Хеш пароля суперадминистратора: password_hash('ваш пароль', PASSWORD_DEFAULT).
    // Пока здесь заглушка, панель суперадмина отключена (403).
    'SUPERADMIN_HASH' => '$2y$10$ЗАМЕНИТЕ_ЭТОТ_ХЕШ_НА_РЕАЛЬНЫЙ_ПАРОЛЬ_ХЕШ_123456789',

    'MIN_PARTICIPANTS'    => 3,
    'MAX_ROOMS'           => 300,
    'MAX_USERS_PER_ROOM'  => 200,
    'ALLOW_EDIT_AFTER_DRAW' => false,
    'SESSION_DAYS'        => 7,
    'FORCE_HTTPS'         => true,
    'TRUST_PROXY_HEADERS' => false,
];

return $config;