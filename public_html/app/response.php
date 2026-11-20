<?php
declare(strict_types=1);

class ApiException extends RuntimeException
{
    public int $status;
    public string $errorCode;
    public array $fields;

    public function __construct(int $status, string $errorCode, string $message, array $fields = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->fields = $fields;
    }
}

class ConflictException extends ApiException
{
    public function __construct(string $errorCode, string $message)
    {
        parent::__construct(409, $errorCode, $message);
    }
}

function santa_json(array $payload): string
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    return $json === false
        ? '{"ok":false,"error":{"code":"SERVER","message":"Внутренняя ошибка сервера"}}'
        : $json;
}

function send_json(int $status, array $payload): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo santa_json($payload);
    exit;
}

function ok(array $data = []): void
{
    send_json(200, ['ok' => true, 'data' => (object)$data]);
}

function fail(int $status, string $code, string $message, array $fields = []): void
{
    $error = ['code' => $code, 'message' => $message];
    if ($fields !== []) {
        $error['fields'] = (object)$fields;
    }
    send_json($status, ['ok' => false, 'error' => $error]);
}

function fail_validation(string $message, array $fields = []): void
{
    fail(400, 'VALIDATION', $message, $fields);
}

function profile_payload(array $row): array
{
    return [
        'full_name' => (string)$row['full_name'],
        'group_or_position' => (string)$row['group_or_position'],
        'contact' => (string)$row['contact'],
        'wish' => (string)$row['wish'],
        'link' => (string)$row['link'],
        'alternative' => (string)$row['alternative'],
    ];
}