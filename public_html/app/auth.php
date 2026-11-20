<?php
declare(strict_types=1);

/**
 * Сессия, CSRF, авторизация ролей и разбор тела запроса.
 */

if (!defined('SANTA_DUMMY_HASH')) {
    // Валидный bcrypt-хеш-заглушка: выравнивает время ответа для несуществующих логинов.
    define('SANTA_DUMMY_HASH', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
}

function csrf_token(): string
{
    return (string)($_SESSION['csrf'] ?? '');
}

function check_csrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = csrf_token();
    if (!is_string($token) || $expected === '' || !hash_equals($expected, $token)) {
        fail(403, 'CSRF', 'Обновите страницу и попробуйте снова');
    }
}

function require_method(string $method): void
{
    $actual = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($actual !== strtoupper($method)) {
        if (!headers_sent()) {
            header('Allow: ' . strtoupper($method));
        }
        fail(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается');
    }
}

function json_body(): array
{
    $declared = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declared > 16384) {
        fail(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос');
    }
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($type, 'application/json') !== 0) {
        fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Требуется Content-Type: application/json');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        $raw = '';
    }
    if (strlen($raw) > 16384) {
        fail(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос');
    }
    if (trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        fail_validation('Некорректный JSON в запросе');
    }
    if ($data !== [] && array_keys($data) === range(0, count($data) - 1)) {
        fail_validation('Тело запроса должно быть JSON-объектом');
    }
    return $data;
}

function current_user(): ?array
{
    $session = $_SESSION['user'] ?? null;
    if (!is_array($session) || !isset($session['id'], $session['room_id'], $session['auth_ver'])) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, room_id, full_name, group_or_position, contact, wish, link, alternative, must_change_pass, auth_ver FROM users WHERE id = :id AND room_id = :room');
    $stmt->execute([':id' => (int)$session['id'], ':room' => (int)$session['room_id']]);
    $row = $stmt->fetch();
    if ($row === false || (int)$row['auth_ver'] !== (int)$session['auth_ver']) {
        unset($_SESSION['user']);
        return null;
    }
    return $row;
}

function require_user(bool $allowMustChange = false): array
{
    $user = current_user();
    if ($user === null) {
        fail(401, 'UNAUTHORIZED', 'Требуется вход в кабинет');
    }
    if ((int)$user['must_change_pass'] === 1 && !$allowMustChange) {
        fail(403, 'PASSWORD_CHANGE_REQUIRED', 'Сначала смените временный пароль');
    }
    return $user;
}

function current_admin(): ?array
{
    $session = $_SESSION['radmin'] ?? null;
    if (!is_array($session) || !isset($session['room_id'], $session['auth_ver'])) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, code, type, status, admin_auth_ver FROM rooms WHERE id = :id');
    $stmt->execute([':id' => (int)$session['room_id']]);
    $room = $stmt->fetch();
    if ($room === false || (int)$room['admin_auth_ver'] !== (int)$session['auth_ver']) {
        unset($_SESSION['radmin']);
        return null;
    }
    return $room;
}

function require_room_admin(): array
{
    $room = current_admin();
    if ($room === null) {
        fail(401, 'UNAUTHORIZED', 'Требуется вход организатора');
    }
    return $room;
}

function current_super(): bool
{
    $session = $_SESSION['super'] ?? null;
    if (!is_array($session) || !isset($session['at']) || !is_int($session['at'])) {
        return false;
    }
    if (time() - $session['at'] > 7200) {
        unset($_SESSION['super']);
        return false;
    }
    return true;
}

function require_super(): void
{
    if (!current_super()) {
        fail(401, 'UNAUTHORIZED', 'Требуется вход суперадминистратора');
    }
}

function logout_session(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => (bool)$params['secure'],
                'httponly' => (bool)$params['httponly'],
                'samesite' => $params['samesite'] ?? 'Lax',
            ]
        );
    }
    session_destroy();
}