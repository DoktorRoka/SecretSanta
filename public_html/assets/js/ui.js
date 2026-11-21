/**
 * DOM-хелперы. Пользовательские данные выводятся только через textContent/append.
 */

import { icon } from './icons.js';

let fieldCounter = 0;

export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null || value === false) {
            continue;
        }
        if (key === 'class') {
            node.className = value;
        } else if (key === 'text') {
            node.textContent = String(value);
        } else if (key === 'dataset') {
            Object.assign(node.dataset, value);
        } else if (key === 'value') {
            node.value = value;
        } else if (key === 'checked') {
            node.checked = Boolean(value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
            node.setAttribute(key, '');
        } else {
            node.setAttribute(key, String(value));
        }
    }
    append(node, children);
    return node;
}

export function append(node, children) {
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        if (child === null || child === undefined || child === false) {
            continue;
        }
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
}

export function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

export function toast(message, tone = 'info') {
    const region = document.getElementById('toasts');
    if (!region) {
        return;
    }
    const item = el('div', { class: 'toast toast-' + tone, role: 'status', text: message });
    region.append(item);
    window.setTimeout(() => item.classList.add('toast-out'), 3800);
    window.setTimeout(() => item.remove(), 4400);
}

export function field(labelText, input, options = {}) {
    const id = input.id || 'field-' + String(++fieldCounter);
    input.id = id;
    const errorId = id + '-error';
    const wrap = el('div', { class: 'field' });
    wrap.append(el('label', { class: 'label', for: id, text: labelText }));
    wrap.append(input);
    if (options.hint) {
        wrap.append(el('p', { class: 'hint', text: options.hint }));
    }
    wrap.append(el('p', { class: 'field-error hidden', id: errorId }));
    if (options.error) {
        setFieldError(input, options.error);
    }
    return wrap;
}

export function passwordField(labelText, options = {}) {
    const input = el('input', {
        class: 'input',
        type: 'password',
        name: options.name || '',
        autocomplete: options.autocomplete || 'current-password',
    });
    const toggle = el('button', {
        class: 'link-btn',
        type: 'button',
        text: 'Показать пароль',
        'aria-pressed': 'false',
    });
    toggle.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.textContent = show ? 'Скрыть пароль' : 'Показать пароль';
        toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    });
    const wrap = field(labelText, input, options);
    wrap.append(toggle);
    return { field: wrap, input, toggle };
}

export function checkboxField(labelText, name, options = {}) {
    const input = el('input', { class: 'checkbox', type: 'checkbox', name });
    const label = el('label', { class: 'checkbox-row' }, [
        input,
        el('span', { class: 'checkbox-text', text: labelText }),
    ]);
    const wrap = el('div', { class: 'field' }, [label]);
    wrap.append(el('p', { class: 'field-error hidden' }));
    if (options.hint) {
        wrap.append(el('p', { class: 'hint', text: options.hint }));
    }
    return { field: wrap, input };
}

export function honeypot() {
    return el('input', {
        class: 'hp',
        type: 'text',
        name: 'website',
        tabindex: '-1',
        autocomplete: 'off',
        'aria-hidden': 'true',
    });
}

export function setFieldError(input, message) {
    const wrap = input.closest ? input.closest('.field') : null;
    if (!wrap) {
        return;
    }
    const errorNode = wrap.querySelector('.field-error');
    if (!errorNode) {
        return;
    }
    errorNode.textContent = message || '';
    errorNode.classList.toggle('hidden', !message);
    if (message) {
        input.setAttribute('aria-invalid', 'true');
        if (errorNode.id) {
            input.setAttribute('aria-describedby', errorNode.id);
        }
    } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    }
}

export function clearFieldErrors(inputs) {
    Object.values(inputs).forEach((input) => {
        if (input) {
            setFieldError(input, '');
        }
    });
}

export function applyServerErrors(inputs, error) {
    clearFieldErrors(inputs);
    let first = null;
    const fields = (error && error.fields) || {};
    for (const [name, message] of Object.entries(fields)) {
        const input = inputs[name];
        if (input && message) {
            setFieldError(input, message);
            if (!first) {
                first = input;
            }
        }
    }
    if (first) {
        first.focus();
    }
    return first;
}

export function formError() {
    return el('p', { class: 'form-error hidden', role: 'alert' });
}

export function showFormError(node, message) {
    if (!node) {
        return;
    }
    node.textContent = message || '';
    node.classList.toggle('hidden', !message);
}

export function setBusy(button, busy, label = 'Подождите…') {
    if (!button) {
        return;
    }
    if (busy) {
        button.dataset.label = button.textContent;
        button.textContent = label;
        button.disabled = true;
    } else {
        button.disabled = false;
        if (button.dataset.label) {
            button.textContent = button.dataset.label;
            delete button.dataset.label;
        }
    }
}

export function loadingBlock(text = 'Загрузка…') {
    return el('div', { class: 'loading-block' }, [
        el('span', { class: 'spinner', 'aria-hidden': 'true' }),
        el('span', { text }),
    ]);
}

export function errorBox(message, onRetry) {
    const box = el('div', { class: 'card error-card' }, [
        el('p', { class: 'lead', text: message }),
    ]);
    if (onRetry) {
        box.append(
            el('button', { class: 'btn btn-secondary', type: 'button', text: 'Повторить', onClick: onRetry }),
        );
    }
    return box;
}

export function pageHeader(title, subtitle, backHash) {
    const header = el('header', { class: 'page-header' });
    if (backHash) {
        header.append(
            el('a', { class: 'back-link', href: backHash }, [
                icon('arrowLeft'),
                el('span', { text: 'Назад' }),
            ]),
        );
    }
    header.append(el('h1', { class: 'page-title', text: title }));
    if (subtitle) {
        header.append(el('p', { class: 'lead', text: subtitle }));
    }
    return header;
}

export function statusBadge(status) {
    const map = {
        open: { text: 'Регистрация открыта', tone: 'success' },
        drawn: { text: 'Жеребьёвка проведена', tone: 'warning' },
    };
    const item = map[status] || { text: status, tone: 'neutral' };
    return el('span', { class: 'badge badge-' + item.tone, text: item.text });
}

export function openModal(options) {
    const root = document.getElementById('modal-root');
    if (!root) {
        return { close: () => {}, dialog: document.createElement('div') };
    }
    const titleId = 'modal-title-' + String(++fieldCounter);
    const previousFocus = document.activeElement;
    const closeButton = el('button', {
        class: 'modal-close',
        type: 'button',
        'aria-label': 'Закрыть',
    }, [icon('close')]);
    const dialog = el('div', {
        class: 'modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
    }, [
        el('div', { class: 'modal-head' }, [
            el('h2', { class: 'modal-title', id: titleId, text: options.title || '' }),
            closeButton,
        ]),
        el('div', { class: 'modal-body' }, options.body || []),
        el('div', { class: 'modal-actions' }, options.actions || []),
    ]);
    const backdrop = el('div', { class: 'modal-backdrop' }, [dialog]);

    let closed = false;
    const close = () => {
        if (closed) {
            return;
        }
        closed = true;
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
        document.body.classList.remove('modal-open');
        if (previousFocus && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
    };
    const onKey = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    };
    closeButton.addEventListener('click', close);
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            close();
        }
    });
    document.addEventListener('keydown', onKey);
    root.append(backdrop);
    document.body.classList.add('modal-open');
    const focusable = dialog.querySelector('input, button, textarea, select, a[href]');
    if (focusable) {
        focusable.focus();
    }
    return { close, dialog };
}

export function typedConfirm(options) {
    const input = options.expected
        ? el('input', { class: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'none' })
        : null;
    const errorNode = formError();
    const body = [];
    if (options.message) {
        body.push(el('p', { class: 'lead', text: options.message }));
    }
    if (input) {
        body.push(field(options.label || 'Подтверждение', input));
        if (options.hint) {
            body.push(el('p', { class: 'hint', text: options.hint }));
        }
    }
    if (options.warning) {
        body.push(el('p', { class: 'warning-text', text: options.warning }));
    }
    body.push(errorNode);

    const modal = openModal({ title: options.title || '', body });
    const cancel = el('button', { class: 'btn btn-ghost', type: 'button', text: 'Отмена' });
    cancel.addEventListener('click', modal.close);
    const confirm = el('button', {
        class: 'btn ' + (options.danger ? 'btn-danger' : 'btn-primary'),
        type: 'button',
        text: options.confirmLabel || 'Подтвердить',
    });
    confirm.addEventListener('click', async () => {
        showFormError(errorNode, '');
        if (input) {
            setFieldError(input, '');
        }
        if (options.expected && input && input.value.trim() !== options.expected) {
            setFieldError(input, 'Введите ' + options.expected);
            input.focus();
            return;
        }
        setBusy(confirm, true, 'Подождите…');
        try {
            const result = await options.onConfirm(input ? input.value.trim() : undefined);
            modal.close();
            if (typeof options.onSuccess === 'function') {
                options.onSuccess(result);
            }
        } catch (error) {
            showFormError(errorNode, error.message || 'Не удалось выполнить действие');
        } finally {
            setBusy(confirm, false);
        }
    });
    modal.dialog.querySelector('.modal-actions').append(cancel, confirm);
    if (input) {
        input.focus();
    }
    return modal;
}

export function showSecret(options) {
    const value = String(options.value || '');
    const output = el('input', {
        class: 'input code-value',
        type: 'text',
        readonly: true,
        value,
        'aria-label': options.label || options.title || 'Значение',
    });
    const copyButton = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Скопировать' });
    const body = [
        el('p', { class: 'hint', text: options.label || '' }),
        output,
    ];
    if (options.warning) {
        body.push(el('p', { class: 'warning-text', text: options.warning }));
    }
    const modal = openModal({ title: options.title || '', body });
    const done = el('button', { class: 'btn btn-primary', type: 'button', text: 'Готово' });
    done.addEventListener('click', modal.close);
    copyButton.addEventListener('click', async () => {
        const copied = await copyText(value);
        toast(copied ? 'Скопировано' : 'Не удалось скопировать', copied ? 'success' : 'error');
    });
    modal.dialog.querySelector('.modal-actions').append(copyButton, done);
    if (options.warning) {
        output.focus();
        output.select();
    }
}

export async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (error) {
        // fallback ниже
    }
    try {
        const area = el('textarea', { class: 'copy-area', readonly: true });
        area.value = text;
        document.body.append(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        return copied;
    } catch (error) {
        return false;
    }
}

export function safeHttpUrl(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
        return null;
    }
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch (error) {
        return null;
    }
}

export function telegramUrl(contact) {
    if (typeof contact === 'string' && /^@[A-Za-z0-9_]+$/.test(contact)) {
        return 'https://t.me/' + contact.slice(1);
    }
    return null;
}

export function formatDate(value) {
    if (!value) {
        return '';
    }
    const normalized = String(value).replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
