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
    toast,
} from '../ui.js';
import { validateCode, validateContact, validatePassword, validateRecovery, validateRequired } from '../validators.js';

export default function recoverView(view) {
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
    const recovery = passwordField('Кодовое слово', {
        name: 'recovery',
        autocomplete: 'off',
        hint: 'Секрет, который вы задали при регистрации. Организатор его не видит.',
    });
    const newPassword = passwordField('Новый пароль', {
        name: 'new_password',
        autocomplete: 'new-password',
        hint: 'От 4 символов',
    });
    const confirmPassword = passwordField('Новый пароль ещё раз', {
        name: 'new_password_confirm',
        autocomplete: 'new-password',
    });
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Восстановить доступ' });
    const inputs = {
        code: codeInput,
        contact: contactInput,
        recovery: recovery.input,
        new_password: newPassword.input,
        new_password_confirm: confirmPassword.input,
    };

    const form = el('form', { class: 'form', novalidate: true }, [
        field('Код комнаты', codeInput),
        field('Контакт', contactInput, { hint: 'Telegram @nickname или телефон, указанный при регистрации' }),
        recovery.field,
        newPassword.field,
        confirmPassword.field,
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
            recovery:
                validateRequired(recovery.input.value, 'Введите кодовое слово') ||
                validateRecovery(recovery.input.value),
            new_password: validatePassword(newPassword.input.value, 4),
        };
        if (newPassword.input.value !== confirmPassword.input.value) {
            errors.new_password_confirm = 'Пароли не совпадают';
        }
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

        setBusy(submit, true, 'Проверяем...');
        try {
            await api('POST', '/api/recover.php', {
                code: codeInput.value.trim(),
                contact: contactInput.value.trim(),
                recovery: recovery.input.value,
                new_password: newPassword.input.value,
            });
            state.user = true;
            state.mustChangePass = false;
            toast('Пароль изменён', 'success');
            location.hash = '#/cabinet';
        } catch (error) {
            if (error.code === 'BAD_CREDENTIALS') {
                showFormError(errorNode, 'Неверный код комнаты, контакт или кодовое слово');
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
        pageHeader(
            'Восстановление доступа',
            'Введите код комнаты, контакт и кодовое слово, которое задали при регистрации.',
            '#/login',
        ),
        el('div', { class: 'card' }, [form]),
        el('p', { class: 'hint center' }, [
            el('a', { class: 'text-link', href: '#/login', text: 'Вернуться ко входу' }),
        ]),
    );
}
