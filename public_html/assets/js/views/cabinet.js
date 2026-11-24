import { api, state } from '../api.js';
import {
    clearFieldErrors,
    copyText,
    el,
    errorBox,
    field,
    formError,
    loadingBlock,
    pageHeader,
    safeHttpUrl,
    setBusy,
    setFieldError,
    showFormError,
    statusBadge,
    telegramUrl,
    toast,
} from '../ui.js';
import { validateAlternative, validateLink, validateWish } from '../validators.js';
import { icon } from '../icons.js';

let pollTimer = null;
let pollListener = null;
let pollBusy = false;

function stopPolling() {
    if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
    }
    if (pollListener) {
        document.removeEventListener('visibilitychange', pollListener);
        pollListener = null;
    }
}

async function logout() {
    try {
        await api('POST', '/api/logout.php');
    } catch (error) {
        // сессия могла уже истечь
    }
    state.user = false;
    state.radmin = false;
    state.super = false;
    state.mustChangePass = false;
    location.hash = '#/home';
}

function actionsRow() {
    const row = el('div', { class: 'actions-row' });
    if (state.radmin) {
        row.append(el('a', { class: 'btn btn-secondary', href: '#/admin', text: 'Панель организатора' }));
    }
    row.append(
        el('a', { class: 'btn btn-ghost', href: '#/password', text: 'Сменить пароль' }),
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'Выйти', onClick: logout }),
    );
    return row;
}

function contactRow(contact) {
    const copy = el('button', {
        class: 'btn btn-small btn-secondary',
        type: 'button',
        text: 'Копировать',
    });
    copy.addEventListener('click', async () => {
        const copied = await copyText(contact);
        toast(copied ? 'Контакт скопирован' : 'Не удалось скопировать', copied ? 'success' : 'error');
    });
    return el('div', { class: 'contact-row' }, [
        el('span', { class: 'contact-value', text: contact }),
        copy,
    ]);
}

function recipientCard(recipient) {
    const card = el('div', { class: 'card gift-card' }, [
        el('h2', { class: 'recipient-name', text: recipient.full_name }),
    ]);
    if (recipient.group_or_position) {
        card.append(el('p', { class: 'muted', text: recipient.group_or_position }));
    }
    card.append(
        el('p', { class: 'gift-label' }, [
            icon('gift'),
            el('span', { text: 'Вы дарите подарок' }),
        ]),
    );

    card.append(el('h3', { class: 'subheading', text: 'Контакт' }), contactRow(recipient.contact));
    const telegram = telegramUrl(recipient.contact);
    if (telegram) {
        card.append(
            el('a', {
                class: 'text-link',
                href: telegram,
                target: '_blank',
                rel: 'noopener noreferrer nofollow',
                text: 'Написать в Telegram',
            }),
        );
    }

    card.append(el('h3', { class: 'subheading', text: 'Пожелания' }));
    card.append(el('p', { class: 'wish-text', text: recipient.wish }));

    if (recipient.link) {
        const url = safeHttpUrl(recipient.link);
        if (url) {
            card.append(el('h3', { class: 'subheading', text: 'Ссылка на вишлист' }));
            card.append(
                el('a', {
                    class: 'btn btn-secondary',
                    href: url.href,
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    text: 'Открыть ссылку',
                }),
                el('p', { class: 'hint', text: url.hostname }),
            );
        }
    }

    if (recipient.alternative) {
        card.append(el('h3', { class: 'subheading', text: 'Альтернатива' }));
        card.append(el('p', { class: 'wish-text', text: recipient.alternative }));
    }

    card.append(el('p', { class: 'warning-text', text: 'Никому не рассказывайте, кого вы выбрали.' }));
    return card;
}

function renderDrawn(view, data) {
    view.append(
        pageHeader('Кабинет', 'Комната ' + data.room.code),
        el('div', { class: 'card stack' }, [
            statusBadge('drawn'),
            el('p', {
                class: 'hint',
                text: 'Жеребьёвка проведена: регистрация и правка анкет закрыты.',
            }),
        ]),
        data.recipient
            ? recipientCard(data.recipient)
            : el('div', { class: 'card' }, [el('p', { class: 'lead', text: 'Получатель не найден. Обратитесь к организатору.' })]),
        actionsRow(),
    );
}

function renderOpen(view, data) {
    const wish = el('textarea', {
        class: 'input textarea',
        name: 'wish',
        rows: '4',
        maxlength: '1000',
    });
    wish.value = data.me.wish;
    const link = el('input', {
        class: 'input',
        type: 'url',
        name: 'link',
        inputmode: 'url',
        maxlength: '500',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
    });
    link.value = data.me.link;
    const alternative = el('textarea', {
        class: 'input textarea',
        name: 'alternative',
        rows: '2',
        maxlength: '500',
    });
    alternative.value = data.me.alternative;

    const errorNode = formError();
    const save = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Сохранить изменения' });
    const inputs = { wish, link, alternative };

    const form = el('form', { class: 'form', novalidate: true }, [
        el('h2', { class: 'section-title', text: 'Ваша анкета' }),
        field('Пожелания к подарку', wish),
        field('Ссылка на вишлист', link, { hint: 'Необязательно, только http или https' }),
        field('Альтернатива', alternative, { hint: 'Необязательно' }),
        errorNode,
        save,
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors(inputs);

        const messages = {
            wish: validateWish(wish.value),
            link: validateLink(link.value),
            alternative: validateAlternative(alternative.value),
        };
        let first = null;
        for (const [name, message] of Object.entries(messages)) {
            if (message) {
                setFieldError(inputs[name], message);
                if (!first) {
                    first = inputs[name];
                }
            }
        }
        if (first) {
            first.focus();
            return;
        }

        setBusy(save, true, 'Сохраняем…');
        try {
            const result = await api('POST', '/api/profile_update.php', {
                wish: wish.value,
                link: link.value,
                alternative: alternative.value,
            });
            data.me = result.me;
            toast('Анкета сохранена', 'success');
        } catch (error) {
            if (error.code === 'ROOM_CLOSED') {
                toast('Жеребьёвка уже проведена — изменения недоступны', 'warning');
                await cabinetView(view);
            } else if (error.fields && Object.keys(error.fields).length > 0) {
                for (const [name, message] of Object.entries(error.fields)) {
                    if (inputs[name]) {
                        setFieldError(inputs[name], message);
                    }
                }
            } else {
                showFormError(errorNode, error.message);
            }
        } finally {
            setBusy(save, false);
        }
    });

    const count = el('p', {
        class: 'stat-line',
        'data-count': '',
        text: 'Зарегистрировано участников: ' + String(data.room.participants_count),
    });

    view.append(
        pageHeader('Кабинет', 'Вы в комнате ' + data.room.code),
        el('div', { class: 'card stack' }, [
            el('div', { class: 'row-between' }, [
                statusBadge(data.room.status),
                el('span', { class: 'badge badge-neutral', text: 'Ожидайте жеребьёвки' }),
                el('span', { class: 'code-pill', text: data.room.code }),
            ]),
            count,
            el('p', {
                class: 'hint',
                text: 'Ожидайте жеребьёвки. Когда организатор её проведёт, здесь появится ваш получатель.',
            }),
        ]),
        el('div', { class: 'card' }, [form]),
        actionsRow(),
    );
}

function startPolling(view, data) {
    stopPolling();
    if (data.room.status !== 'open') {
        return;
    }

    const check = async () => {
        if (document.hidden || pollBusy) {
            return;
        }
        pollBusy = true;
        try {
            const fresh = await api('GET', '/api/me.php');
            if (fresh.must_change_pass) {
                state.mustChangePass = true;
                location.hash = '#/password';
                return;
            }
            if (fresh.room && fresh.room.status === 'drawn') {
                stopPolling();
                await cabinetView(view);
                return;
            }
            if (fresh.room && fresh.room.participants_count !== data.room.participants_count) {
                data.room.participants_count = fresh.room.participants_count;
                const node = view.querySelector('[data-count]');
                if (node) {
                    node.textContent = 'Зарегистрировано участников: ' + String(fresh.room.participants_count);
                }
            }
        } catch (error) {
            // 401 обрабатывается глобально
        } finally {
            pollBusy = false;
        }
    };

    pollTimer = window.setInterval(check, 60000);
    pollListener = () => {
        if (!document.hidden) {
            check();
        }
    };
    document.addEventListener('visibilitychange', pollListener);
}

export default async function cabinetView(view) {
    stopPolling();
    view.replaceChildren(loadingBlock());

    let data;
    try {
        data = await api('GET', '/api/me.php');
    } catch (error) {
        if (error.status === 401) {
            return;
        }
        view.replaceChildren(errorBox(error.message, () => cabinetView(view)));
        return;
    }

    if (data.must_change_pass) {
        state.mustChangePass = true;
        location.hash = '#/password';
        return;
    }

    state.user = true;
    state.mustChangePass = false;
    view.replaceChildren();

    if (data.room.status === 'drawn') {
        renderDrawn(view, data);
    } else {
        renderOpen(view, data);
        startPolling(view, data);
    }

    return stopPolling;
}