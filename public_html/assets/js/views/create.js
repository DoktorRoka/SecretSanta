import { api, state } from '../api.js';
import {
    checkboxField,
    clearFieldErrors,
    copyText,
    el,
    field,
    formError,
    honeypot,
    pageHeader,
    passwordField,
    setBusy,
    setFieldError,
    showFormError,
    toast,
} from '../ui.js';
import { buildProfileSection, markProfileErrors, readProfile } from './profile.js';
import { validateCode, validatePassword, validateProfile } from '../validators.js';
import { icon } from '../icons.js';
import { helpButton } from '../help.js';

function rolePrompt(view) {
    view.append(
        pageHeader('Создать комнату', 'Сначала выберите, для кого комната.', '#/home'),
        el('div', { class: 'choice-grid' }, [
            el('a', { class: 'choice-card', href: '#/role/student' }, [
                el('span', { class: 'choice-icon', 'aria-hidden': 'true' }, [icon('cap')]),
                el('span', { class: 'choice-title', text: 'Для студентов' }),
            ]),
            el('a', { class: 'choice-card', href: '#/role/teacher' }, [
                el('span', { class: 'choice-icon', 'aria-hidden': 'true' }, [icon('board')]),
                el('span', { class: 'choice-title', text: 'Для преподавателей' }),
            ]),
        ]),
    );
}

function createdScreen(view, code) {
    view.replaceChildren();
    const codeValue = el('input', {
        class: 'input code-value',
        type: 'text',
        readonly: true,
        value: code,
        'aria-label': 'Код комнаты',
    });
    const copy = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Скопировать код' });
    copy.addEventListener('click', async () => {
        const copied = await copyText(code);
        toast(copied ? 'Код скопирован' : 'Не удалось скопировать', copied ? 'success' : 'error');
    });

    view.append(
        pageHeader('Комната создана', 'Теперь пригласите участников.', null),
        el('div', { class: 'card stack center' }, [
            el('span', { class: 'kicker', text: 'Код комнаты' }),
            codeValue,
            copy,
            el('p', {
                class: 'warning-text',
                text: 'Запишите код и пароль организатора. Восстановить их можно только через суперадминистратора.',
            }),
        ]),
        el('a', { class: 'btn btn-primary btn-block', href: '#/cabinet', text: 'В кабинет' }),
    );
}

export default function createView(view) {
    if (!state.role) {
        rolePrompt(view);
        return;
    }

    const role = state.role;
    const codeInput = el('input', {
        class: 'input',
        type: 'text',
        name: 'code',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        maxlength: '40',
        placeholder: 'например, группа-ис21',
    });
    const adminPassword = passwordField('Пароль организатора', {
        name: 'admin_password',
        autocomplete: 'new-password',
        hint: 'От 8 символов. Пароль для панели комнаты (код + этот пароль). Участникам его не сообщайте.',
    });
    const adminConfirm = passwordField('Пароль организатора ещё раз', {
        name: 'admin_password_confirm',
        autocomplete: 'new-password',
    });
    const profile = buildProfileSection(role, { withPassword: true });
    const consent = checkboxField(
        'Я согласен(на) на обработку персональных данных',
        'consent',
        { hint: 'Данные участников видны только получателям и удаляются после мероприятия.' },
    );
    consent.input.name = 'consent';
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Создать комнату' });

    const allInputs = {
        ...profile.inputs,
        code: codeInput,
        admin_password: adminPassword.input,
        admin_confirm: adminConfirm.input,
        consent: consent.input,
    };

    const form = el('form', { class: 'form', novalidate: true }, [
        el('div', { class: 'room-summary' }, [
            el('span', { class: 'muted', text: 'Тип комнаты' }),
            el('span', { class: 'badge badge-info', text: role === 'student' ? 'Для студентов' : 'Для преподавателей' }),
        ]),
        field('Код комнаты', codeInput, {
            hint: '6–40 символов: буквы, цифры, _ и -. Не используйте очевидные коды.',
        }),
        adminPassword.field,
        adminConfirm.field,
        el('p', { class: 'info-note' }, [
            'Здесь два разных пароля. ',
            el('strong', { text: 'Пароль организатора' }),
            ' открывает панель комнаты. ',
            el('strong', { text: 'Пароль для входа' }),
            ' — личный, для вашего кабинета участника; вы зададите его ниже, в анкете.',
        ]),
        el('div', { class: 'help-row help-row-start' }, [
            helpButton('Подробнее о паролях', 'link-btn'),
        ]),
        profile.section,
        consent.field,
        errorNode,
        submit,
        honeypot(),
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors(allInputs);

        const errors = validateProfile(readProfile(profile.inputs), role, { withPassword: true });
        const codeMessage = validateCode(codeInput.value);
        if (codeMessage) {
            errors.code = codeMessage;
        }
        const passwordMessage = validatePassword(adminPassword.input.value, 8);
        if (passwordMessage) {
            errors.admin_password = passwordMessage;
        }
        if (adminPassword.input.value !== adminConfirm.input.value) {
            errors.admin_confirm = 'Пароли не совпадают';
        }
        if (!consent.input.checked) {
            errors.consent = 'Подтвердите согласие на обработку данных';
        }

        if (Object.keys(errors).length > 0) {
            markProfileErrors(profile.inputs, errors);
            for (const name of ['code', 'admin_password', 'admin_confirm', 'consent']) {
                if (errors[name]) {
                    setFieldError(allInputs[name], errors[name]);
                }
            }
            const first = ['code', 'admin_password', 'admin_confirm'].find((name) => errors[name]);
            if (first) {
                allInputs[first].focus();
            } else if (errors.consent) {
                consent.input.focus();
            }
            return;
        }

        setBusy(submit, true, 'Создаём…');
        try {
            const data = await api('POST', '/api/room_create.php', {
                role,
                code: codeInput.value.trim(),
                admin_password: adminPassword.input.value,
                consent: true,
                website: '',
                profile: readProfile(profile.inputs),
            });
            state.user = true;
            state.radmin = true;
            state.mustChangePass = false;
            createdScreen(view, data.room.code);
        } catch (error) {
            if (error.code === 'ROOM_EXISTS') {
                setFieldError(codeInput, error.message);
                codeInput.focus();
            } else if (error.fields && Object.keys(error.fields).length > 0) {
                markProfileErrors(profile.inputs, error.fields);
                for (const name of ['code', 'admin_password', 'consent']) {
                    if (error.fields[name]) {
                        setFieldError(allInputs[name], error.fields[name]);
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
            'Создать комнату',
            role === 'student' ? 'Комната для студентов' : 'Комната для преподавателей',
            '#/role/' + role,
        ),
        el('div', { class: 'card' }, [form]),
    );
}