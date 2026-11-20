/**
 * Клиентская валидация — зеркало серверных правил.
 */

function length(value) {
    return Array.from(value).length;
}

export function validateCode(value) {
    const code = String(value || '').trim().toLowerCase();
    if (!/^[a-zа-яё0-9_-]{6,40}$/u.test(code)) {
        return 'Код комнаты: 6–40 символов, буквы, цифры, _ и -';
    }
    return '';
}

export function validateFullName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    if (length(name) < 2 || length(name) > 100) {
        return 'Имя: от 2 до 100 символов';
    }
    return '';
}

export function validateGroup(value, role) {
    const group = String(value || '').trim();
    if (role === 'student') {
        if (length(group) < 1) {
            return 'Укажите группу';
        }
        if (length(group) > 30) {
            return 'Группа: не более 30 символов';
        }
    } else if (length(group) > 100) {
        return 'Должность: не более 100 символов';
    }
    return '';
}

export function validateContact(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return 'Укажите Telegram (@nickname) или телефон';
    }
    const phone = raw.replace(/[\s()-]/g, '');
    if (/^\+?\d{10,15}$/.test(phone)) {
        return '';
    }
    if (/^@?[A-Za-z0-9_]{5,32}$/.test(raw)) {
        return '';
    }
    return 'Telegram: @nickname (5–32 символа) или телефон, например +7 999 123-45-67';
}

export function validateWish(value) {
    const wish = String(value || '').trim();
    if (length(wish) < 1) {
        return 'Опишите пожелания';
    }
    if (length(wish) > 1000) {
        return 'Пожелания: не более 1000 символов';
    }
    return '';
}

export function validateAlternative(value) {
    if (length(String(value || '').trim()) > 500) {
        return 'Альтернатива: не более 500 символов';
    }
    return '';
}

export function validateLink(value) {
    const link = String(value || '').trim();
    if (!link) {
        return '';
    }
    if (length(link) > 500) {
        return 'Ссылка: не более 500 символов';
    }
    if (/\s/.test(link) || link.includes('\\')) {
        return 'Ссылка не должна содержать пробелы';
    }
    let url;
    try {
        url = new URL(link);
    } catch (error) {
        return 'Укажите ссылку вида https://example.com';
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'Допустимы только ссылки http и https';
    }
    if (url.username || url.password) {
        return 'Ссылка не должна содержать логин и пароль';
    }
    if (!url.hostname || !url.hostname.includes('.')) {
        return 'Ссылка должна содержать домен';
    }
    return '';
}

export function byteLength(value) {
    try {
        return new TextEncoder().encode(String(value)).length;
    } catch (error) {
        return String(value).length;
    }
}

export function validatePassword(value, min = 4) {
    const bytes = byteLength(value);
    if (bytes < min || bytes > 72) {
        return 'Пароль: от ' + String(min) + ' до 72 символов';
    }
    return '';
}

export function validateRequired(value, message) {
    return String(value || '').trim() === '' ? message : '';
}

export function validateProfile(values, role, options = {}) {
    const errors = {};
    const withPassword = options.withPassword !== false;
    const messages = {
        full_name: validateFullName(values.full_name),
        group_or_position: validateGroup(values.group_or_position, role),
        contact: validateContact(values.contact),
        wish: validateWish(values.wish),
        link: validateLink(values.link),
        alternative: validateAlternative(values.alternative),
    };
    for (const [key, message] of Object.entries(messages)) {
        if (message) {
            errors[key] = message;
        }
    }
    if (withPassword) {
        const message = validatePassword(values.password, 4);
        if (message) {
            errors.password = message;
        }
    }
    return errors;
}