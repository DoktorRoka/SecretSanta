import { api, state } from '../api.js';
import {
    clearFieldErrors,
    el,
    formError,
    pageHeader,
    passwordField,
    setBusy,
    setFieldError,
    showFormError,
    toast,
} from '../ui.js';
import { validatePassword, validateRequired } from '../validators.js';

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

export default function passwordView(view) {
    const oldPassword = passwordField('Текущий пароль', {
        name: 'old_password',
        autocomplete: 'current-password',
    });
    const newPassword = passwordField('Новый пароль', {
        name: 'new_password',
        autocomplete: 'new-password',
        hint: 'От 4 символов, у организатора — от 8',
    });
    const confirmPassword = passwordField('Новый пароль ещё раз', {
        name: 'new_password_confirm',
        autocomplete: 'new-password',
    });
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Сменить пароль' });
    const inputs = {
        old_password: oldPassword.input,
        new_password: newPassword.input,
        new_password_confirm: confirmPassword.input,
    };

    const form = el('form', { class: 'form', novalidate: true }, [
        oldPassword.field,
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
            old_password: validateRequired(oldPassword.input.value, 'Введите текущий пароль'),
            new_password: validatePassword(newPassword.input.value, 4),
        };
        if (oldPassword.input.value === newPassword.input.value && newPassword.input.value !== '') {
            errors.new_password = 'Новый пароль должен отличаться от текущего';
        }
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

        setBusy(submit, true, 'Меняем…');
        try {
            await api('POST', '/api/password_change.php', {
                old_password: oldPassword.input.value,
                new_password: newPassword.input.value,
            });
            state.mustChangePass = false;
            state.user = true;
            toast('Пароль изменён', 'success');
            location.hash = '#/cabinet';
        } catch (error) {
            if (error.fields && Object.keys(error.fields).length > 0) {
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
        pageHeader('Смена пароля', 'Введите текущий пароль и придумайте новый.'),
        el('div', { class: 'card' }, [form]),
        el('p', { class: 'center' }, [
            el('button', { class: 'link-btn', type: 'button', text: 'Выйти', onClick: logout }),
        ]),
    );
}