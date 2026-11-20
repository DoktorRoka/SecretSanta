import { api, loadSession, state } from './api.js';
import { initRouter, renderRoute } from './router.js';
import { startSnow } from './ui.js';

startSnow();

window.addEventListener('santa:unauthorized', (event) => {
    const path = (event.detail && event.detail.path) || '';
    state.user = false;
    state.mustChangePass = false;

    if (path.startsWith('/api/admin')) {
        state.radmin = false;
        if (location.hash === '#/admin') {
            renderRoute();
        } else {
            location.hash = '#/admin';
        }
        return;
    }
    if (path.startsWith('/api/super')) {
        state.super = false;
        if (location.hash === '#/super') {
            renderRoute();
        } else {
            location.hash = '#/super';
        }
        return;
    }
    if (location.hash === '#/login') {
        renderRoute();
    } else {
        location.hash = '#/login';
    }
});

async function bootstrap() {
    try {
        await loadSession();
        if (state.user) {
            try {
                const me = await api('GET', '/api/me.php');
                if (me.must_change_pass) {
                    state.mustChangePass = true;
                }
            } catch (error) {
                // 401 уже обработан событием santa:unauthorized
            }
        }
    } catch (error) {
        // Сервер недоступен: экраны покажут сетевое сообщение.
    }
    initRouter();
}

bootstrap();