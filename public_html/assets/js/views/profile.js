import { el, field, passwordField, setFieldError } from '../ui.js';

export function buildProfileSection(role, options = {}) {
    const withPassword = options.withPassword !== false;
    const inputs = {};

    inputs.full_name = el('input', {
        class: 'input',
        type: 'text',
        name: 'full_name',
        autocomplete: 'name',
        maxlength: '100',
        placeholder: 'Иван Петров',
    });
    inputs.group_or_position = el('input', {
        class: 'input',
        type: 'text',
        name: 'group_or_position',
        maxlength: role === 'student' ? '30' : '100',
        placeholder: role === 'student' ? 'ИС-21' : 'доцент кафедры информатики',
    });
    inputs.contact = el('input', {
        class: 'input',
        type: 'text',
        name: 'contact',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        maxlength: '64',
        placeholder: '@nickname или +7 999 123-45-67',
    });
    inputs.wish = el('textarea', {
        class: 'input textarea',
        name: 'wish',
        rows: '4',
        maxlength: '1000',
        placeholder: 'Что вы хотели бы получить в подарок',
    });
    inputs.link = el('input', {
        class: 'input',
        type: 'url',
        name: 'link',
        inputmode: 'url',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        maxlength: '500',
        placeholder: 'https://example.com/wishlist',
    });
    inputs.alternative = el('textarea', {
        class: 'input textarea',
        name: 'alternative',
        rows: '2',
        maxlength: '500',
        placeholder: 'Запасной вариант подарка',
    });

    const children = [
        el('h2', { class: 'section-title', text: 'Ваша анкета' }),
        el('p', {
            class: 'hint',
            text: 'Эти данные увидит только тот, кто будет вам дарить подарок после жеребьёвки.',
        }),
        field('Имя и фамилия', inputs.full_name),
        field(role === 'student' ? 'Группа' : 'Должность или кафедра', inputs.group_or_position, {
            hint: role === 'student' ? 'Обязательно' : 'Можно не заполнять',
        }),
        field('Контакт для связи', inputs.contact, {
            hint: 'Telegram (@nickname) или телефон. По нему вы будете входить в кабинет.',
        }),
        field('Пожелания к подарку', inputs.wish, {
            hint: 'До 1000 символов. Получатель увидит этот текст.',
        }),
        field('Ссылка на вишлист', inputs.link, { hint: 'Необязательно, только http или https' }),
        field('Альтернатива', inputs.alternative, {
            hint: 'Необязательно: что подойдёт, если основное желание недоступно',
        }),
    ];

    if (withPassword) {
        const password = passwordField('Пароль для входа', {
            name: 'password',
            autocomplete: 'new-password',
            hint: 'От 4 символов. Личный пароль для входа в кабинет: код комнаты + контакт + этот пароль.',
        });
        inputs.password = password.input;
        children.push(password.field);
    }

    if (options.withRecovery !== false) {
        const recovery = passwordField('Кодовое слово', {
            name: 'recovery',
            autocomplete: 'off',
            hint: 'Придумайте свой секрет (от 4 символов). Если забудете пароль, восстановите доступ по нему. Организатор его не видит.',
        });
        inputs.recovery = recovery.input;
        children.push(recovery.field);
    }

    return {
        section: el('div', { class: 'form-section' }, children),
        inputs,
    };
}

export function readProfile(inputs) {
    const read = (name) => {
        const input = inputs[name];
        return input ? String(input.value || '') : '';
    };
    return {
        full_name: read('full_name'),
        group_or_position: read('group_or_position'),
        contact: read('contact'),
        wish: read('wish'),
        link: read('link'),
        alternative: read('alternative'),
        password: read('password'),
        recovery: read('recovery'),
    };
}

export function markProfileErrors(inputs, errors) {
    let first = null;
    for (const [name, message] of Object.entries(errors || {})) {
        const input = inputs[name];
        if (!input || !message) {
            continue;
        }
        setFieldError(input, message);
        if (!first) {
            first = input;
        }
    }
    if (first) {
        first.focus();
    }
    return first;
}