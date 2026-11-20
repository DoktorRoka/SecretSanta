import { api, state } from '../api.js';
import {
    clearFieldErrors,
    el,
    errorBox,
    formError,
    formatDate,
    loadingBlock,
    pageHeader,
    passwordField,
    setBusy,
    setFieldError,
    showFormError,
    showSecret,
    toast,
    typedConfirm,
} from '../ui.js';
import { validateRequired } from '../validators.js';

async function logout() {
    try {
        await api('POST', '/api/logout.php');
    } catch (error) {
        // ignore
    }
    state.user = false;
    state.radmin = false;
    state.super = false;
    state.mustChangePass = false;
    location.hash = '#/home';
}

function loginScreen(view) {
    const password = passwordField('Пароль суперадминистратора', {
        name: 'password',
        autocomplete: 'current-password',
    });
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Войти' });
    const form = el('form', { class: 'form', novalidate: true }, [
        password.field,
        errorNode,
        submit,
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors({ password: password.input });
        const message = validateRequired(password.input.value, 'Введите пароль');
        if (message) {
            setFieldError(password.input, message);
            password.input.focus();
            return;
        }

        setBusy(submit, true, 'Входим…');
        try {
            await api('POST', '/api/super/login.php', { password: password.input.value });
            state.super = true;
            await renderPanel(view);
        } catch (error) {
            if (error.code === 'BAD_CREDENTIALS') {
                showFormError(errorNode, 'Неверный пароль суперадминистратора');
            } else {
                showFormError(errorNode, error.message);
            }
        } finally {
            setBusy(submit, false);
        }
    });

    view.append(
        pageHeader('Суперадминистратор', 'Служебная панель. Ссылка на неё не публикуется.'),
        el('div', { class: 'card' }, [form]),
        el('p', { class: 'center' }, [el('a', { class: 'text-link', href: '#/home', text: 'На главную' })]),
    );
}

function statusCell(status) {
    const open = status === 'open';
    return el('span', {
        class: 'badge ' + (open ? 'badge-success' : 'badge-warning'),
        text: open ? 'Открыта' : 'Проведена',
    });
}

function actionButton(label, className, onClick) {
    const button = el('button', { class: 'btn btn-small ' + className, type: 'button', text: label });
    button.addEventListener('click', onClick);
    return button;
}

function roomRow(view, room) {
    const actions = el('div', { class: 'table-actions' });

    if (room.status === 'open') {
        actions.append(
            actionButton('Жеребьёвка', 'btn-secondary', () => {
                typedConfirm({
                    title: 'Провести жеребьёвку?',
                    message: 'Комната ' + room.code + ': после жеребьёвки регистрация закроется.',
                    confirmLabel: 'Провести',
                    onConfirm: () => api('POST', '/api/super/draw.php', { room_id: room.id }),
                    onSuccess: async () => {
                        toast('Жеребьёвка проведена', 'success');
                        await renderPanel(view);
                    },
                });
            }),
        );
    } else {
        actions.append(
            actionButton('Сбросить жеребьёвку', 'btn-ghost', () => {
                typedConfirm({
                    title: 'Сбросить жеребьёвку?',
                    message: 'Пары комнаты ' + room.code + ' будут удалены, регистрация снова откроется.',
                    warning: 'Участники, уже видевшие получателя, после повторной жеребьёвки увидят нового.',
                    label: 'Введите код комнаты',
                    expected: room.code,
                    confirmLabel: 'Сбросить',
                    danger: true,
                    onConfirm: () => api('POST', '/api/super/draw_reset.php', {
                        room_id: room.id,
                        confirm_code: room.code,
                    }),
                    onSuccess: async () => {
                        toast('Жеребьёвка сброшена', 'success');
                        await renderPanel(view);
                    },
                });
            }),
        );
    }

    actions.append(
        actionButton('Пароль', 'btn-secondary', () => {
            typedConfirm({
                title: 'Сбросить пароль организатора?',
                message: 'Для комнаты ' + room.code + ' будет создан новый временный пароль.',
                confirmLabel: 'Сбросить',
                onConfirm: () => api('POST', '/api/super/room_reset_admin.php', { room_id: room.id }),
                onSuccess: (data) => {
                    showSecret({
                        title: 'Новый пароль организатора',
                        label: 'Пароль для комнаты ' + room.code,
                        value: data.password,
                        warning: 'Показывается один раз. Передайте организатору лично.',
                    });
                },
            });
        }),
    );

    actions.append(
        actionButton('Удалить', 'btn-ghost-danger', () => {
            typedConfirm({
                title: 'Удалить комнату?',
                message: 'Комната ' + room.code + ', её участники и пары будут удалены безвозвратно.',
                label: 'Введите код комнаты',
                expected: room.code,
                confirmLabel: 'Удалить',
                danger: true,
                onConfirm: () => api('POST', '/api/super/room_delete.php', {
                    room_id: room.id,
                    confirm_code: room.code,
                }),
                onSuccess: async () => {
                    toast('Комната удалена', 'success');
                    await renderPanel(view);
                },
            });
        }),
    );

    return el('tr', {}, [
        el('td', {}, [el('span', { class: 'code-pill', text: room.code })]),
        el('td', { text: room.type === 'student' ? 'Студенты' : 'Преподаватели' }),
        el('td', {}, [statusCell(room.status)]),
        el('td', { class: 'num', text: String(room.participants_count) }),
        el('td', { class: 'nowrap', text: formatDate(room.created_at) }),
        el('td', {}, [actions]),
    ]);
}

function roomsTable(view, rooms) {
    if (rooms.length === 0) {
        return el('div', { class: 'card' }, [
            el('p', { class: 'lead', text: 'Комнат пока нет.' }),
        ]);
    }

    const tbody = el('tbody');
    rooms.forEach((room) => tbody.append(roomRow(view, room)));

    return el('div', { class: 'table-wrap' }, [
        el('table', { class: 'table' }, [
            el('thead', {}, [
                el('tr', {}, [
                    el('th', { text: 'Код' }),
                    el('th', { text: 'Тип' }),
                    el('th', { text: 'Статус' }),
                    el('th', { text: 'Участники' }),
                    el('th', { text: 'Создана' }),
                    el('th', { text: 'Действия' }),
                ]),
            ]),
            tbody,
        ]),
    ]);
}

async function renderPanel(view) {
    view.replaceChildren(loadingBlock());
    let data;
    try {
        data = await api('GET', '/api/super/rooms.php');
    } catch (error) {
        if (error.status === 401) {
            state.super = false;
            loginScreen(view);
            return;
        }
        view.replaceChildren(errorBox(error.message, () => renderPanel(view)));
        return;
    }

    const actions = el('div', { class: 'actions-row' });
    const refresh = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Обновить' });
    refresh.addEventListener('click', () => renderPanel(view));

    const purge = el('button', { class: 'btn btn-danger', type: 'button', text: 'Очистить всё' });
    purge.addEventListener('click', () => {
        typedConfirm({
            title: 'Очистить всё?',
            message: 'Будут удалены все комнаты, участники, пары и журнал попыток.',
            warning: 'Действие необратимо. Сначала убедитесь, что резервная копия БД сохранена.',
            label: 'Введите УДАЛИТЬ ВСЁ',
            expected: 'УДАЛИТЬ ВСЁ',
            confirmLabel: 'Очистить',
            danger: true,
            onConfirm: () => api('POST', '/api/super/purge.php', { confirm: 'УДАЛИТЬ ВСЁ' }),
            onSuccess: async () => {
                toast('Все данные удалены', 'success');
                await renderPanel(view);
            },
        });
    });

    actions.append(refresh, el('button', { class: 'btn btn-ghost', type: 'button', text: 'Выйти', onClick: logout }));

    view.append(
        pageHeader('Суперадминистратор', 'Комнат: ' + String(data.rooms.length)),
        roomsTable(view, data.rooms),
        actions,
        el('div', { class: 'danger-zone' }, [
            el('h2', { class: 'section-title', text: 'Опасная зона' }),
            el('p', { class: 'hint', text: 'Полная очистка после мероприятия.' }),
            purge,
        ]),
    );
}

export default async function superView(view) {
    if (!state.super) {
        loginScreen(view);
        return;
    }
    await renderPanel(view);
}