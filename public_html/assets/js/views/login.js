import { api, state } from '../api.js';
import {
    clearFieldErrors,
    el,
    field,
    formError,
    pageHeader,
    passwordField,
    setBusy,
    setFieldError,
    showFormError,
} from '../ui.js';
import { validateCode, validateContact, validateRequired } from '../validators.js';
import { helpButton } from '../help.js';

export default function loginView(view) {
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
    const contactInput = el('input', {
        class: 'input',
        type: 'text',
        name: 'contact',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        maxlength: '64',
        placeholder: '@nickname или телефон',
    });
    const password = passwordField('Пароль или временный ПИН', {
        name: 'password',
        autocomplete: 'current-password',
        hint: 'Личный пароль. У организатора он же открывает панель комнаты. Если организатор сбросил ПИН — введите временный, затем зададите новый.',
    });
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Войти' });
    const inputs = { code: codeInput, contact: contactInput, password: password.input };

    const form = el('form', { class: 'form', novalidate: true }, [
        field('Код комнаты', codeInput),
        field('Контакт', contactInput, { hint: 'Telegram @nickname или телефон, указанный при регистрации' }),
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
            contact: validateContact(contactInput.value),
            password: validateRequired(password.input.value, 'Введите пароль'),
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

        setBusy(submit, true, 'Входим…');
        try {
            const data = await api('POST', '/api/login.php', {
                code: codeInput.value.trim(),
                contact: contactInput.value.trim(),
                password: password.input.value,
            });
            state.user = true;
            state.mustChangePass = Boolean(data.must_change_pass);
            if (state.mustChangePass) {
                location.hash = '#/password';
            } else {
                location.hash = '#/cabinet';
            }
        } catch (error) {
            if (error.code === 'BAD_CREDENTIALS') {
                showFormError(errorNode, 'Неверный код комнаты, контакт или пароль');
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
            setBusy(submit, false);
        }
    });

    view.append(
        pageHeader('Вход в кабинет', 'Введите код комнаты и контакт, указанный при регистрации.', '#/home'),
        el('div', { class: 'card' }, [form]),
        el('div', { class: 'help-row' }, [helpButton('Какой пароль вводить?', 'btn btn-ghost btn-small')]),
        el('p', {
            class: 'hint center',
            text: 'Забыли пароль? Организатор может сбросить ПИН до жеребьёвки; после неё восстановление — только через сброс жеребьёвки.',
        }),
    );
}