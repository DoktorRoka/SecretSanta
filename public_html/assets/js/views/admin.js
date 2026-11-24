import { api, state } from '../api.js';
import {
    clearFieldErrors,
    el,
    errorBox,
    field,
    formError,
    loadingBlock,
    pageHeader,
    passwordField,
    setBusy,
    setFieldError,
    showFormError,
    statusBadge,
    toast,
    typedConfirm,
} from '../ui.js';
import { validateCode, validateRequired } from '../validators.js';
import { icon } from '../icons.js';
import { helpButton } from '../help.js';

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
    const codeInput = el('input', {
        class: 'input',
        type: 'text',
        name: 'code',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        maxlength: '40',
        placeholder: 'код комнаты',
    });
    const password = passwordField('Пароль организатора', {
        name: 'password',
        autocomplete: 'current-password',
        hint: 'Пароль, который вы задали при создании комнаты. Тем же паролем вы входите в свой кабинет.',
    });
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Войти как организатор' });
    const inputs = { code: codeInput, password: password.input };

    const form = el('form', { class: 'form', novalidate: true }, [
        field('Код комнаты', codeInput),
        password.field,
        errorNode,
        submit,
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors(inputs);
        const errors = {
            code: validateCode(codeInput.value),
            password: validateRequired(password.input.value, 'Введите пароль организатора'),
        };
        const invalid = Object.entries(errors).find(([, message]) => message);
        if (invalid) {
            for (const [name, message] of Object.entries(errors)) {
                if (message) {
                    setFieldError(inputs[name], message);
                }
            }
            inputs[invalid[0]].focus();
            return;
        }

        setBusy(submit, true, 'Входим...');
        try {
            await api('POST', '/api/admin/login.php', {
                code: codeInput.value.trim(),
                password: password.input.value,
            });
            state.radmin = true;
            await renderPanel(view);
        } catch (error) {
            if (error.code === 'BAD_CREDENTIALS') {
                showFormError(errorNode, 'Неверный код комнаты или пароль организатора');
            } else {
                showFormError(errorNode, error.message);
            }
        } finally {
            setBusy(submit, false);
        }
    });

    view.append(
        pageHeader('Панель организатора', 'Введите код комнаты и пароль, который задали при создании.', '#/home'),
        el('div', { class: 'card' }, [form]),
        el('div', { class: 'help-row' }, [helpButton('Какой пароль вводить?', 'btn btn-ghost btn-small')]),
        el('p', { class: 'hint center', text: 'Забыли пароль организатора? Его сбросит суперадминистратор мероприятия.' }),
    );
}

function deleteUser(view, user) {
    typedConfirm({
        title: 'Удалить участника?',
        message: user.full_name + ' будет удалён из комнаты. Это действие нельзя отменить.',
        confirmLabel: 'Удалить',
        danger: true,
        onConfirm: () => api('POST', '/api/admin/user_delete.php', { user_id: user.id }),
        onSuccess: async () => {
            toast('Участник удалён', 'success');
            await renderPanel(view);
        },
    });
}

function drawModal(view, room) {
    typedConfirm({
        title: 'Провести жеребьёвку?',
        message: 'После жеребьёвки регистрация закрывается, правка анкет и удаление участников становятся недоступны.',
        label: 'Введите слово ПРОВЕСТИ',
        expected: 'ПРОВЕСТИ',
        confirmLabel: 'Провести',
        danger: true,
        onConfirm: () => api('POST', '/api/admin/draw.php', { confirm: true }),
        onSuccess: async () => {
            toast('Жеребьёвка проведена', 'success');
            await renderPanel(view);
        },
    });
}

function userList(view, room, users) {
    if (users.length === 0) {
        return el('div', { class: 'card' }, [
            el('p', { class: 'lead', text: 'В комнате пока нет участников.' }),
        ]);
    }

    const list = el('ul', { class: 'user-list' });
    users.forEach((user) => {
        const actions = el('div', { class: 'user-actions' });
        if (room.status === 'open') {
            const deleteButton = el('button', {
                class: 'btn btn-small btn-ghost-danger',
                type: 'button',
                text: 'Удалить',
            });
            deleteButton.addEventListener('click', () => deleteUser(view, user));
            actions.append(deleteButton);
        }

        const main = el('div', { class: 'user-main' }, [
            el('p', { class: 'user-name', text: user.full_name }),
        ]);
        if (user.group_or_position) {
            main.append(el('p', { class: 'muted', text: user.group_or_position }));
        }
        main.append(el('p', { class: 'muted', text: user.contact }));

        list.append(el('li', { class: 'user-item' }, [main, actions]));
    });
    return list;
}

async function renderPanel(view) {
    view.replaceChildren(loadingBlock());
    let data;
    try {
        data = await api('GET', '/api/admin/room.php');
    } catch (error) {
        if (error.status === 401) {
            state.radmin = false;
            view.replaceChildren();
            loginScreen(view);
            return;
        }
        view.replaceChildren(errorBox(error.message, () => renderPanel(view)));
        return;
    }

    const { room, users } = data;
    const canDraw = room.status === 'open' && room.participants_count >= room.min_participants;

    const drawButton = el('button', {
        class: 'btn btn-primary btn-block',
        type: 'button',
    }, [icon('dice'), el('span', { text: 'Провести жеребьёвку' })]);
    drawButton.disabled = !canDraw;
    drawButton.addEventListener('click', () => drawModal(view, room));

    const drawHint = el('p', {
        class: 'hint',
        text:
            room.status === 'drawn'
                ? 'Жеребьёвка уже проведена. Сброс возможен только через суперадминистратора.'
                : room.participants_count < room.min_participants
                    ? 'Нужно минимум ' + String(room.min_participants) + ' участников.'
                    : 'После жеребьёвки регистрация закрывается.',
    });

    const actions = el('div', { class: 'actions-row' });
    if (state.user) {
        actions.append(el('a', { class: 'btn btn-secondary', href: '#/cabinet', text: 'Мой кабинет' }));
    }
    const refresh = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Обновить' });
    refresh.addEventListener('click', () => renderPanel(view));
    actions.append(refresh, el('button', { class: 'btn btn-ghost', type: 'button', text: 'Выйти', onClick: logout }));

    view.replaceChildren();
    view.append(
        pageHeader('Панель организатора', 'Комната ' + room.code),
        el('div', { class: 'card stack' }, [
            el('div', { class: 'row-between' }, [
                statusBadge(room.status),
                el('span', { class: 'code-pill', text: room.code }),
            ]),
            el('p', {
                class: 'stat-line',
                text: String(room.participants_count) + ' участников (минимум ' + String(room.min_participants) + ')',
            }),
            el('p', {
                class: 'hint',
                text: 'Участники сами восстанавливают пароль по своему кодовому слову — организатор паролей не видит и не сбрасывает.',
            }),
            drawButton,
            drawHint,
        ]),
        userList(view, room, users),
        actions,
    );
}

export default async function adminView(view) {
    if (!state.radmin) {
        loginScreen(view);
        return;
    }
    await renderPanel(view);
}
