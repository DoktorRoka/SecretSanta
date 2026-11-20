import { api, state } from '../api.js';
import {
    checkboxField,
    clearFieldErrors,
    el,
    field,
    formError,
    honeypot,
    pageHeader,
    setBusy,
    setFieldError,
    showFormError,
    toast,
} from '../ui.js';
import { buildProfileSection, markProfileErrors, readProfile } from './profile.js';
import { validateCode, validateProfile } from '../validators.js';
import { icon } from '../icons.js';

function rolePrompt(view) {
    view.append(
        pageHeader('Присоединиться', 'Сначала выберите свою роль.', '#/home'),
        el('div', { class: 'choice-grid' }, [
            el('a', { class: 'choice-card', href: '#/role/student' }, [
                el('span', { class: 'choice-icon', 'aria-hidden': 'true' }, [icon('cap')]),
                el('span', { class: 'choice-title', text: 'Я студент' }),
            ]),
            el('a', { class: 'choice-card', href: '#/role/teacher' }, [
                el('span', { class: 'choice-icon', 'aria-hidden': 'true' }, [icon('board')]),
                el('span', { class: 'choice-title', text: 'Я преподаватель' }),
            ]),
        ]),
    );
}

function stepOne(view) {
    view.replaceChildren();
    state.pendingJoin = null;

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
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Продолжить' });

    const form = el('form', { class: 'form', novalidate: true }, [
        field('Код комнаты', codeInput, { hint: 'Код присылает организатор' }),
        errorNode,
        submit,
        honeypot(),
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors({ code: codeInput });
        const message = validateCode(codeInput.value);
        if (message) {
            setFieldError(codeInput, message);
            codeInput.focus();
            return;
        }

        setBusy(submit, true, 'Проверяем…');
        try {
            const data = await api('POST', '/api/room_check.php', { code: codeInput.value.trim() });
            if (data.type !== state.role) {
                showFormError(
                    errorNode,
                    data.type === 'teacher' ? 'Эта комната для преподавателей' : 'Эта комната для студентов',
                );
                return;
            }
            state.pendingJoin = { code: codeInput.value.trim().toLowerCase(), type: data.type };
            stepTwo(view);
        } catch (error) {
            if (error.code === 'ROOM_NOT_FOUND') {
                setFieldError(codeInput, 'Комната не найдена, проверьте код');
            } else if (error.code === 'ROOM_CLOSED') {
                showFormError(errorNode, 'Регистрация в этой комнате уже закрыта');
            } else if (error.code === 'VALIDATION' && error.fields && error.fields.code) {
                setFieldError(codeInput, error.fields.code);
            } else {
                showFormError(errorNode, error.message);
            }
        } finally {
            setBusy(submit, false);
        }
    });

    view.append(
        pageHeader('Присоединиться', 'Введите код комнаты, который прислал организатор.', '#/role/' + state.role),
        el('div', { class: 'card' }, [form]),
    );
}

function stepTwo(view) {
    view.replaceChildren();
    const { code } = state.pendingJoin;
    const profile = buildProfileSection(state.role, { withPassword: true });
    const consent = checkboxField(
        'Я согласен(на) на обработку персональных данных',
        'consent',
        {
            hint: 'Данные видны только вашему получателю и удаляются после мероприятия.',
        },
    );
    const errorNode = formError();
    const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Зарегистрироваться' });
    const back = el('button', {
        class: 'link-btn',
        type: 'button',
        onClick: () => stepOne(view),
    }, [icon('arrowLeft'), el('span', { text: 'Изменить код' })]);

    const allInputs = { ...profile.inputs, consent: consent.input };
    consent.input.name = 'consent';

    const form = el('form', { class: 'form', novalidate: true }, [
        el('div', { class: 'room-summary' }, [
            el('span', { class: 'muted', text: 'Комната' }),
            el('span', { class: 'code-pill', text: code }),
        ]),
        profile.section,
        consent.field,
        errorNode,
        submit,
        back,
        honeypot(),
    ]);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showFormError(errorNode, '');
        clearFieldErrors(allInputs);

        const errors = validateProfile(readProfile(profile.inputs), state.role, { withPassword: true });
        if (!consent.input.checked) {
            errors.consent = 'Подтвердите согласие на обработку данных';
        }
        if (Object.keys(errors).length > 0) {
            markProfileErrors(profile.inputs, errors);
            if (errors.consent) {
                setFieldError(consent.input, errors.consent);
                consent.input.focus();
            }
            return;
        }

        setBusy(submit, true, 'Отправляем…');
        try {
            await api('POST', '/api/register.php', {
                role: state.role,
                code,
                consent: true,
                website: '',
                profile: readProfile(profile.inputs),
            });
            state.user = true;
            state.pendingJoin = null;
            state.mustChangePass = false;
            toast('Вы зарегистрированы', 'success');
            location.hash = '#/cabinet';
        } catch (error) {
            if (error.code === 'LOGIN_TAKEN') {
                setFieldError(profile.inputs.contact, error.message);
                profile.inputs.contact.focus();
            } else if (error.fields && Object.keys(error.fields).length > 0) {
                markProfileErrors(profile.inputs, error.fields);
                if (error.fields.consent) {
                    setFieldError(consent.input, error.fields.consent);
                }
            } else {
                showFormError(errorNode, error.message);
            }
        } finally {
            setBusy(submit, false);
        }
    });

    view.append(
        pageHeader('Ваша анкета', 'Заполните данные — их увидит получатель вашего подарка.', '#/join'),
        el('div', { class: 'card' }, [form]),
    );
}

export default function joinView(view) {
    if (!state.role) {
        rolePrompt(view);
        return;
    }
    stepOne(view);
}