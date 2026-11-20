import { toast } from './ui.js';

export const state = {
    csrf: '',
    user: false,
    radmin: false,
    super: false,
    role: null,
    pendingJoin: null,
    mustChangePass: false,
};

export class ApiError extends Error {
    constructor(status, code, message, fields = {}) {
        super(message || 'Ошибка');
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.fields = fields || {};
    }
}

let sessionPromise = null;

export async function loadSession() {
    if (!sessionPromise) {
        sessionPromise = rawFetch('GET', '/api/session.php')
            .then((data) => {
                state.csrf = data.csrf || '';
                state.user = Boolean(data.user);
                state.radmin = Boolean(data.radmin);
                state.super = Boolean(data.super);
                return data;
            })
            .finally(() => {
                sessionPromise = null;
            });
    }
    return sessionPromise;
}

async function rawFetch(method, path, body) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        if (state.csrf) {
            headers['X-CSRF-Token'] = state.csrf;
        }
    }
    const options = {
        method,
        credentials: 'same-origin',
        headers,
        signal: controller.signal,
        cache: 'no-store',
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(path, options);
    } catch (error) {
        throw new ApiError(0, 'NETWORK', 'Нет соединения с сервером');
    } finally {
        window.clearTimeout(timer);
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (payload && typeof payload === 'object' && payload.ok === true) {
        return payload.data && typeof payload.data === 'object' ? payload.data : {};
    }
    if (payload && typeof payload === 'object' && payload.error) {
        throw new ApiError(
            response.status,
            payload.error.code || 'SERVER',
            payload.error.message || 'Ошибка',
            payload.error.fields || {},
        );
    }
    throw new ApiError(response.status, 'SERVER', 'Сервер вернул некорректный ответ');
}

function handleError(error) {
    if (!(error instanceof ApiError)) {
        return;
    }
    if (error.status === 401 && error.code === 'UNAUTHORIZED') {
        window.dispatchEvent(new CustomEvent('santa:unauthorized', { detail: { path: error.path } }));
    } else if (error.status === 429) {
        toast('Слишком много попыток, подождите несколько минут', 'warning');
    } else if (error.status === 0) {
        toast('Нет соединения с сервером', 'error');
    }
}

export async function api(method, path, body) {
    if (method !== 'GET' && !state.csrf) {
        await loadSession();
    }

    let retried = false;
    for (;;) {
        try {
            return await rawFetch(method, path, body);
        } catch (error) {
            if (
                !retried
                && error instanceof ApiError
                && error.status === 403
                && error.code === 'CSRF'
            ) {
                retried = true;
                await loadSession();
                continue;
            }
            if (error instanceof ApiError) {
                error.path = path;
            }
            handleError(error);
            throw error;
        }
    }
}