import { ApiError, state } from './api.js';
import { clear, el, errorBox, pageHeader } from './ui.js';
import home from './views/home.js';
import role from './views/role.js';
import join from './views/join.js';
import create from './views/create.js';
import login from './views/login.js';
import cabinet from './views/cabinet.js';
import password from './views/password.js';
import admin from './views/admin.js';
import superView from './views/super.js';

const routes = [
    { path: '/home', view: home, allowLocked: false },
    { path: '/role/:role', view: role, allowLocked: false },
    { path: '/join', view: join, allowLocked: false },
    { path: '/create', view: create, allowLocked: false },
    { path: '/login', view: login, allowLocked: false },
    { path: '/cabinet', view: cabinet, allowLocked: false },
    { path: '/password', view: password, allowLocked: true },
    { path: '/admin', view: admin, allowLocked: false },
    { path: '/super', view: superView, allowLocked: false },
];

let cleanup = null;
let renderToken = 0;
let started = false;

function currentPath() {
    const raw = location.hash.replace(/^#/, '');
    return raw === '' ? '/home' : raw;
}

function matchRoute(path) {
    const actual = path.split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean);
    for (const route of routes) {
        const parts = route.path.split('/').filter(Boolean);
        if (parts.length !== actual.length) {
            continue;
        }
        const params = {};
        let matched = true;
        for (let index = 0; index < parts.length; index++) {
            const part = parts[index];
            if (part.startsWith(':')) {
                params[part.slice(1)] = decodeURIComponent(actual[index]);
            } else if (part !== actual[index]) {
                matched = false;
                break;
            }
        }
        if (matched) {
            return { route, params };
        }
    }
    return null;
}

function renderNotFound(view) {
    view.append(
        pageHeader('Страница не найдена', 'Похоже, такой страницы нет.'),
        el('p', { class: 'center' }, [
            el('a', { class: 'btn btn-primary', href: '#/home', text: 'На главную' }),
        ]),
    );
}

export async function renderRoute() {
    const view = document.getElementById('view');
    if (!view) {
        return;
    }
    const token = ++renderToken;

    if (cleanup) {
        try {
            cleanup();
        } catch (error) {
            // ignore
        }
        cleanup = null;
    }
    clear(view);
    window.scrollTo(0, 0);

    const match = matchRoute(currentPath());
    if (!match) {
        renderNotFound(view);
        return;
    }
    if (state.mustChangePass && !match.route.allowLocked) {
        location.hash = '#/password';
        return;
    }

    try {
        const result = await match.route.view(view, match.params);
        if (token !== renderToken) {
            if (typeof result === 'function') {
                result();
            }
            return;
        }
        cleanup = typeof result === 'function' ? result : null;
    } catch (error) {
        if (token !== renderToken) {
            return;
        }
        if (error instanceof ApiError && error.status === 401) {
            return;
        }
        view.append(
            errorBox(
                error instanceof ApiError ? error.message : 'Не удалось открыть страницу.',
                () => renderRoute(),
            ),
        );
    }
}

export function initRouter() {
    if (started) {
        return;
    }
    started = true;
    window.addEventListener('hashchange', () => {
        renderRoute();
    });
    if (!location.hash) {
        history.replaceState(null, '', '#/home');
    }
    renderRoute();
}