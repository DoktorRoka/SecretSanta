<?php
declare(strict_types=1);

/**
 * Нормализация и валидация пользовательского ввода.
 */

function v_fail(string $field, string $message): void
{
    fail_validation($message, [$field => $message]);
}

function v_string(array $data, string $key, string $field, bool $required = true): string
{
    if (!array_key_exists($key, $data) || $data[$key] === null) {
        if ($required) {
            v_fail($field, 'Заполните поле');
        }
        return '';
    }
    if (!is_string($data[$key])) {
        v_fail($field, 'Некорректное значение');
    }
    return $data[$key];
}

function v_object(array $data, string $key): array
{
    if (!isset($data[$key]) || !is_array($data[$key])) {
        v_fail($key, 'Заполните анкету');
    }
    return $data[$key];
}

function v_int_id(array $data, string $key): int
{
    if (!array_key_exists($key, $data) || !is_int($data[$key]) || $data[$key] <= 0) {
        v_fail($key, 'Некорректный идентификатор');
    }
    return $data[$key];
}

function v_clean_line(string $value): string
{
    $value = preg_replace('/[\p{Cc}\p{Cf}]/u', '', $value) ?? '';
    $value = preg_replace('/[\s\p{Z}]+/u', ' ', $value) ?? '';
    return trim($value);
}

function v_clean_multiline(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{Cc}\n]/u', '', $value) ?? '';
    return trim($value);
}

function v_code(string $raw): string
{
    $code = mb_strtolower(trim($raw), 'UTF-8');
    if (!preg_match('/^[a-zа-яё0-9_-]{6,40}$/u', $code)) {
        v_fail('code', 'Код комнаты: 6–40 символов, буквы, цифры, _ и - без пробелов');
    }
    return $code;
}

function v_try_code(string $raw): ?string
{
    $code = mb_strtolower(trim($raw), 'UTF-8');
    return preg_match('/^[a-zа-яё0-9_-]{6,40}$/u', $code) ? $code : null;
}

function v_role(array $data): string
{
    $role = v_string($data, 'role', 'role');
    if ($role !== 'student' && $role !== 'teacher') {
        v_fail('role', 'Выберите роль');
    }
    return $role;
}

function v_full_name(string $raw): string
{
    $value = v_clean_line($raw);
    $length = mb_strlen($value);
    if ($length < 2 || $length > 100) {
        v_fail('full_name', 'Имя: от 2 до 100 символов');
    }
    return $value;
}

function v_group_or_position(string $raw, string $role): string
{
    $value = v_clean_line($raw);
    $length = mb_strlen($value);
    if ($role === 'student') {
        if ($length < 1 || $length > 30) {
            v_fail('group_or_position', 'Укажите группу: от 1 до 30 символов');
        }
    } elseif ($length > 100) {
        v_fail('group_or_position', 'Должность: не более 100 символов');
    }
    return $value;
}

function v_contact_normalize(string $raw): ?array
{
    $raw = trim($raw);
    if ($raw === '') {
        return null;
    }
    $phone = preg_replace('/[\s()\-]/u', '', $raw) ?? '';
    if (preg_match('/^\+?[0-9]{10,15}$/', $phone)) {
        $digits = ltrim($phone, '+');
        if (strlen($digits) === 11 && $digits[0] === '8') {
            $digits = '7' . substr($digits, 1);
            $contact = '+' . $digits;
        } elseif (strlen($digits) === 11 && $digits[0] === '7') {
            $contact = '+' . $digits;
        } elseif (strpos($phone, '+') === 0) {
            $contact = '+' . $digits;
        } else {
            $contact = $digits;
        }
        return ['login' => $digits, 'contact' => $contact];
    }
    if (preg_match('/^@?[A-Za-z0-9_]{5,32}$/', $raw)) {
        $username = strtolower(ltrim($raw, '@'));
        return ['login' => $username, 'contact' => '@' . $username];
    }
    return null;
}

function v_contact(string $raw): array
{
    $contact = v_contact_normalize($raw);
    if ($contact === null) {
        v_fail('contact', 'Укажите Telegram (@nickname) или телефон');
    }
    return $contact;
}

function v_wish(string $raw): string
{
    $value = v_clean_multiline($raw);
    $length = mb_strlen($value);
    if ($length < 1 || $length > 1000) {
        v_fail('wish', 'Пожелания: от 1 до 1000 символов');
    }
    return $value;
}

function v_alternative(string $raw): string
{
    $value = v_clean_multiline($raw);
    if (mb_strlen($value) > 500) {
        v_fail('alternative', 'Альтернатива: не более 500 символов');
    }
    return $value;
}

function v_link(string $raw): string
{
    $value = trim($raw);
    if ($value === '') {
        return '';
    }
    $error = 'Ссылка: только http или https, без пробелов';
    if (mb_strlen($value) > 500 || preg_match('/\s/u', $value) || preg_match('/[\p{Cc}]/u', $value) || strpos($value, '\\') !== false) {
        v_fail('link', $error);
    }
    $parts = parse_url($value);
    if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
        v_fail('link', $error);
    }
    $scheme = strtolower((string)$parts['scheme']);
    if ($scheme !== 'http' && $scheme !== 'https') {
        v_fail('link', 'Ссылка: допустимы только http и https');
    }
    if (isset($parts['user']) || isset($parts['pass'])) {
        v_fail('link', 'Ссылка не должна содержать логин и пароль');
    }
    if (!filter_var($value, FILTER_VALIDATE_URL)) {
        v_fail('link', $error);
    }
    $host = (string)$parts['host'];
    if (strpos($host, '.') === false || strpos($host, '.') === 0 || substr($host, -1) === '.') {
        v_fail('link', 'Ссылка должна содержать домен');
    }
    return $value;
}

function v_password(string $value, int $min, string $field = 'password'): string
{
    $length = strlen($value);
    if (strpos($value, "\0") !== false || $length < $min || $length > 72) {
        v_fail($field, 'Пароль: от ' . $min . ' до 72 символов');
    }
    return $value;
}

function v_consent(array $data): void
{
    if (!array_key_exists('consent', $data) || $data['consent'] !== true) {
        v_fail('consent', 'Подтвердите согласие на обработку персональных данных');
    }
}

function v_profile(array $profile, string $role, bool $withPassword): array
{
    $contact = v_contact(v_string($profile, 'contact', 'contact'));
    $result = [
        'full_name' => v_full_name(v_string($profile, 'full_name', 'full_name')),
        'group_or_position' => v_group_or_position(v_string($profile, 'group_or_position', 'group_or_position', false), $role),
        'contact' => $contact['contact'],
        'login' => $contact['login'],
        'wish' => v_wish(v_string($profile, 'wish', 'wish')),
        'link' => v_link(v_string($profile, 'link', 'link', false)),
        'alternative' => v_alternative(v_string($profile, 'alternative', 'alternative', false)),
    ];
    if ($withPassword) {
        $result['password'] = v_password(v_string($profile, 'password', 'password'), 4);
    }
    return $result;
}