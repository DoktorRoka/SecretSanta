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
    stepper,
    toast,
} from '../ui.js';
import { buildProfileSection, markProfileErrors, readProfile } from './profile.js';
import {
    validateAlternative,
    validateCode,
    validateContact,
    validateFullName,
    validateGroup,
    validateLink,
    validatePassword,
    validateRecovery,
    validateWish,
} from '../validators.js';
import { icon } from '../icons.js';
import { helpButton } from '../help.js';

const STEPS = ['Код', 'Анкета', 'Подарок'];

const STEP_FIELDS = {
    0: ['code'],
    1: ['full_name', 'group_or_position', 'contact', 'password', 'recovery'],
    2: ['wish', 'link', 'alternative', 'consent'],
};

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

export default function joinView(view) {
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
    const profile = buildProfileSection(role, { withPassword: true });
    const consent = checkboxField(
        'Я согласен(на) на обработку персональных данных',
        'consent',
        { hint: 'Данные видны только вашему получателю и удаляются после мероприятия.' },
    );
    consent.input.name = 'consent';

    const allInputs = { ...profile.inputs, code: codeInput, consent: consent.input };

    const SUBTITLES = [
        'Введите код комнаты, который прислал организатор.',
        'Заполните анкету — её увидит получатель вашего подарка.',
        'Опишите желания и завершите регистрацию.',
    ];

    function roomSummary() {
        return el('div', { class: 'room-summary' }, [
            el('span', { class: 'muted', text: 'Комната' }),
            el('span', { class: 'code-pill', text: state.pendingJoin ? state.pendingJoin.code : '' }),
        ]);
    }

    function render(step) {
        view.replaceChildren(
            pageHeader(
                step === 0 ? 'Присоединиться' : 'Ваша анкета',
                SUBTITLES[step],
                step === 0 ? '#/role/' + role : null,
            ),
            el('div', { class: 'card' }, [stepper(STEPS, step), buildStep(step)]),
        );
        if (step === 0) {
            view.append(el('div', { class: 'help-row' }, [helpButton('Как это работает')]));
        }
        window.scrollTo(0, 0);
    }

    function backButton(label, step) {
        return el('button', {
            class: 'link-btn',
            type: 'button',
            onClick: () => {
                if (step === 0) {
                    state.pendingJoin = null;
                }
                render(step);
            },
        }, [icon('arrowLeft'), el('span', { text: label })]);
    }

    function validateIdentity() {
        const values = readProfile(profile.inputs);
        const errors = {};
        const name = validateFullName(values.full_name);
        if (name) {
            errors.full_name = name;
        }
        const group = validateGroup(values.group_or_position, role);
        if (group) {
            errors.group_or_position = group;
        }
        const contact = validateContact(values.contact);
        if (contact) {
            errors.contact = contact;
        }
        const password = validatePassword(values.password, 4);
        if (password) {
            errors.password = password;
        }
        const recovery = validateRecovery(values.recovery);
        if (recovery) {
            errors.recovery = recovery;
        }
        return errors;
    }

    function validateGift() {
        const values = readProfile(profile.inputs);
        const errors = {};
        const wish = validateWish(values.wish);
        if (wish) {
            errors.wish = wish;
        }
        const link = validateLink(values.link);
        if (link) {
            errors.link = link;
        }
        const alternative = validateAlternative(values.alternative);
        if (alternative) {
            errors.alternative = alternative;
        }
        if (!consent.input.checked) {
            errors.consent = 'Подтвердите согласие на обработку данных';
        }
        return errors;
    }

    function showStepErrors(errors) {
        if (Object.keys(errors).length === 0) {
            return false;
        }
        markProfileErrors(profile.inputs, errors);
        for (const name of ['code', 'consent']) {
            if (errors[name]) {
                setFieldError(allInputs[name], errors[name]);
            }
        }
        return true;
    }

    function buildCodeStep() {
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
            clearFieldErrors(allInputs);
            const message = validateCode(codeInput.value);
            if (message) {
                setFieldError(codeInput, message);
                codeInput.focus();
                return;
            }

            setBusy(submit, true, 'Проверяем...');
            try {
                const data = await api('POST', '/api/room_check.php', { code: codeInput.value.trim() });
                if (data.type !== role) {
                    showFormError(
                        errorNode,
                        data.type === 'teacher' ? 'Эта комната для преподавателей' : 'Эта комната для студентов',
                    );
                    return;
                }
                state.pendingJoin = { code: codeInput.value.trim().toLowerCase(), type: data.type };
                render(1);
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

        return form;
    }

    function buildIdentityStep() {
        const errorNode = formError();
        const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Продолжить' });

        const form = el('form', { class: 'form', novalidate: true }, [
            roomSummary(),
            profile.identity,
            profile.credentials,
            errorNode,
            submit,
            backButton('Изменить код', 0),
            honeypot(),
        ]);

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            showFormError(errorNode, '');
            clearFieldErrors(allInputs);
            const errors = validateIdentity();
            if (showStepErrors(errors)) {
                return;
            }
            render(2);
        });

        return form;
    }

    function buildGiftStep() {
        const errorNode = formError();
        const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Зарегистрироваться' });

        const form = el('form', { class: 'form', novalidate: true }, [
            roomSummary(),
            profile.gift,
            consent.field,
            errorNode,
            submit,
            backButton('Назад к анкете', 1),
            honeypot(),
        ]);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            showFormError(errorNode, '');
            clearFieldErrors(allInputs);

            const giftErrors = validateGift();
            const identityErrors = validateIdentity();
            if (showStepErrors({ ...giftErrors, ...identityErrors })) {
                if (Object.keys(identityErrors).length > 0) {
                    render(1);
                    showStepErrors(identityErrors);
                }
                return;
            }

            setBusy(submit, true, 'Отправляем...');
            try {
                await api('POST', '/api/register.php', {
                    role,
                    code: state.pendingJoin.code,
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
                    render(1);
                    setFieldError(profile.inputs.contact, error.message);
                    profile.inputs.contact.focus();
                } else if (error.fields && Object.keys(error.fields).length > 0) {
                    const step = STEP_FIELDS[1].some((name) => error.fields[name]) ? 1 : 2;
                    render(step);
                    showStepErrors(error.fields);
                } else {
                    showFormError(errorNode, error.message);
                }
            } finally {
                setBusy(submit, false);
            }
        });

        return form;
    }

    function buildStep(step) {
        if (step === 0) {
            return buildCodeStep();
        }
        if (step === 1) {
            return buildIdentityStep();
        }
        return buildGiftStep();
    }

    state.pendingJoin = null;
    render(0);
}
