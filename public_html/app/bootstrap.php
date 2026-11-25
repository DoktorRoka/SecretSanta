<?php
declare(strict_types=1);

/**
 * Единая точка старта API: конфиг, заголовки, сессия, обработка ошибок.
 * Каждый файл api/*.php подключает только этот файл.
 */

if (defined('SANTA_BOOTSTRAPPED')) {
    return;
}
define('SANTA_BOOTSTRAPPED', true);

define('SANTA_ROOT', dirname(__DIR__));
define('SANTA_APP', __DIR__);
define('SANTA_DATA', SANTA_ROOT . DIRECTORY_SEPARATOR . 'data');

function cfg(string $key, $default = null)
{
    $config = $GLOBALS['SANTA_CONFIG'] ?? [];
    return array_key_exists($key, $config) ? $config[$key] : $default;
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443) {
        return true;
    }
    return (bool)cfg('TRUST_PROXY_HEADERS', false)
        && isset($_SERVER['HTTP_X_FORWARDED_PROTO'])
        && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https';
}

function client_ip(): string
{
    if ((bool)cfg('TRUST_PROXY_HEADERS', false) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $first = explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        $first = trim($first);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

function santa_log(string $message): void
{
    $line = '[' . gmdate('Y-m-d H:i:s') . ' UTC] ' . $message . PHP_EOL;
    $file = SANTA_DATA . DIRECTORY_SEPARATOR . 'error.log';
    @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
}

function santa_handle_exception(Throwable $e): void
{
    if ($e instanceof ApiException) {
        fail($e->status, $e->errorCode, $e->getMessage(), $e->fields);
    }
    $message = $e->getMessage();
    if ($e instanceof PDOException && (stripos($message, 'database is locked') !== false
        || stripos($message, 'database table is locked') !== false)) {
        fail(503, 'BUSY', 'Повторите через несколько секунд');
    }
    santa_log(get_class($e) . ': ' . $message . ' in ' . $e->getFile() . ':' . $e->getLine());
    fail(500, 'SERVER', 'Внутренняя ошибка сервера');
}

function santa_handle_shutdown(): void
{
    $error = error_get_last();
    if ($error === null || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    santa_log('Fatal: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']);
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo '{"ok":false,"error":{"code":"SERVER","message":"Внутренняя ошибка сервера"}}';
    }
}

$configFile = SANTA_ROOT . DIRECTORY_SEPARATOR . 'config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"error":{"code":"SERVER","message":"Сервер не настроен: отсутствует config.php"}}';
    exit;
}

$loaded = require $configFile;
if (!is_array($loaded)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"error":{"code":"SERVER","message":"Сервер не настроен: config.php должен возвращать массив"}}';
    exit;
}
$GLOBALS['SANTA_CONFIG'] = $loaded;
unset($loaded, $configFile);

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/validate.php';
require_once __DIR__ . '/ratelimit.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/draw.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '0');
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});
set_exception_handler('santa_handle_exception');
register_shutdown_function('santa_handle_shutdown');

foreach ([SANTA_DATA, SANTA_DATA . DIRECTORY_SEPARATOR . 'sessions'] as $directory) {
    if (!is_dir($directory)) {
        @mkdir($directory, 0700, true);
    }
}

$driver = strtolower((string)cfg('DB_DRIVER', 'sqlite'));
$required = ['pdo', 'mbstring', $driver === 'mysql' ? 'pdo_mysql' : 'pdo_sqlite'];
foreach ($required as $extension) {
    if (!extension_loaded($extension)) {
        santa_log('Missing PHP extension: ' . $extension);
        fail(500, 'SERVER', 'Сервер не настроен: отсутствует расширение ' . $extension);
    }
}

header('Content-Security-Policy: default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; connect-src \'self\'; manifest-src \'self\'; worker-src \'self\'; base-uri \'none\'; form-action \'self\'; frame-ancestors \'none\'');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cache-Control: no-store');
if (is_https()) {
    header('Strict-Transport-Security: max-age=31536000');
}

$sessionDays = max(1, (int)cfg('SESSION_DAYS', 7));
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.gc_maxlifetime', (string)($sessionDays * 86400));
session_name('santa_sid');
session_set_cookie_params([
    'lifetime' => $sessionDays * 86400,
    'path' => '/',
    'domain' => '',
    'secure' => is_https(),
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    if (!@session_start()) {
        santa_log('Unable to start session; check data/sessions permissions');
        fail(500, 'SERVER', 'Не удалось начать сессию');
    }
}
if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}