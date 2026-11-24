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

const STEPS = ['Комната', 'Анкета', 'Подарок'];

const STEP_FIELDS = {
    0: ['code', 'admin_password', 'admin_confirm'],
    1: ['full_name', 'group_or_position', 'contact', 'recovery', 'password'],
    2: ['wish', 'link', 'alternative', 'consent'],
};

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
            el('span', { class: 'field-caption', text: 'Код комнаты' }),
            codeValue,
            copy,
            el('p', {
                class: 'warning-text',
                text: 'Запишите код комнаты и пароль организатора — этим же паролем вы входите в свой кабинет. Если забудете пароль, восстановить доступ поможет кодовое слово, которое вы задали.',
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

    // Поля создаются один раз: при переходах между шагами значения сохраняются.
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
        hint: 'От 8 символов. Один пароль для панели организатора и для входа в ваш кабинет. Участникам его не сообщайте.',
    });
    const adminConfirm = passwordField('Пароль организатора ещё раз', {
        name: 'admin_password_confirm',
        autocomplete: 'new-password',
    });
    const profile = buildProfileSection(role, { withPassword: false });
    const consent = checkboxField(
        'Я согласен(на) на обработку персональных данных',
        'consent',
        { hint: 'Данные участников видны только получателям и удаляются после мероприятия.' },
    );
    consent.input.name = 'consent';

    const allInputs = {
        ...profile.inputs,
        code: codeInput,
        admin_password: adminPassword.input,
        admin_confirm: adminConfirm.input,
        consent: consent.input,
    };

    const SUBTITLES = [
        role === 'student' ? 'Комната для студентов' : 'Комната для преподавателей',
        'Заполните анкету — эти данные увидит только ваш получатель.',
        'Опишите желания и подтвердите создание комнаты.',
    ];

    function render(step) {
        view.replaceChildren(
            pageHeader(
                'Создать комнату',
                SUBTITLES[step],
                step === 0 ? '#/role/' + role : null,
            ),
            el('div', { class: 'card' }, [stepper(STEPS, step), buildStep(step)]),
        );
        window.scrollTo(0, 0);
    }

    function backButton(label, step) {
        return el('button', {
            class: 'link-btn',
            type: 'button',
            onClick: () => render(step),
        }, [icon('arrowLeft'), el('span', { text: label })]);
    }

    function validateRoom() {
        const errors = {};
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
        return errors;
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

    function showStepErrors(errors, errorNode) {
        const names = Object.keys(errors);
        if (names.length === 0) {
            return false;
        }
        markProfileErrors(profile.inputs, errors);
        for (const name of ['code', 'admin_password', 'admin_confirm', 'consent']) {
            if (errors[name]) {
                setFieldError(allInputs[name], errors[name]);
            }
        }
        if (errorNode) {
            showFormError(errorNode, '');
        }
        return true;
    }

    function buildRoomStep() {
        const errorNode = formError();
        const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Продолжить' });

        const form = el('form', { class: 'form', novalidate: true }, [
            el('div', { class: 'room-summary' }, [
                el('span', { class: 'muted', text: 'Тип комнаты' }),
                el('span', {
                    class: 'badge badge-info',
                    text: role === 'student' ? 'Для студентов' : 'Для преподавателей',
                }),
            ]),
            field('Код комнаты', codeInput, {
                hint: '6–40 символов: буквы, цифры, _ и -. Не используйте очевидные коды.',
            }),
            adminPassword.field,
            adminConfirm.field,
            el('p', { class: 'info-note' }, [
                'Пароль один на всё: им вы открываете и ',
                el('strong', { text: 'панель организатора' }),
                ', и свой ',
                el('strong', { text: 'кабинет' }),
                '. Участникам он не нужен — у каждого из них свой пароль.',
            ]),
            el('div', { class: 'help-row help-row-start' }, [
                helpButton('Подробнее о паролях', 'link-btn'),
            ]),
            errorNode,
            submit,
            honeypot(),
        ]);

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            showFormError(errorNode, '');
            clearFieldErrors(allInputs);
            const errors = validateRoom();
            if (showStepErrors(errors, errorNode)) {
                const first = STEP_FIELDS[0].find((name) => errors[name]);
                if (first) {
                    allInputs[first].focus();
                }
                return;
            }
            render(1);
        });

        return form;
    }

    function buildIdentityStep() {
        const errorNode = formError();
        const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Продолжить' });

        const form = el('form', { class: 'form', novalidate: true }, [
            profile.identity,
            profile.credentials,
            errorNode,
            submit,
            backButton('Изменить комнату', 0),
            honeypot(),
        ]);

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            showFormError(errorNode, '');
            clearFieldErrors(allInputs);
            const errors = validateIdentity();
            if (showStepErrors(errors, errorNode)) {
                return;
            }
            render(2);
        });

        return form;
    }

    function buildGiftStep() {
        const errorNode = formError();
        const submit = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Создать комнату' });

        const form = el('form', { class: 'form', novalidate: true }, [
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

            const errors = validateGift();
            const identityErrors = validateIdentity();
            const roomErrors = validateRoom();
            if (showStepErrors({ ...errors, ...identityErrors, ...roomErrors }, errorNode)) {
                // Ошибки предыдущих шагов — вернуться туда, где их исправить.
                if (Object.keys(roomErrors).length > 0) {
                    render(0);
                    showStepErrors(roomErrors, null);
                } else if (Object.keys(identityErrors).length > 0) {
                    render(1);
                    showStepErrors(identityErrors, null);
                }
                return;
            }

            setBusy(submit, true, 'Создаём...');
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
                    render(0);
                    setFieldError(codeInput, error.message);
                    codeInput.focus();
                } else if (error.fields && Object.keys(error.fields).length > 0) {
                    const step = STEP_FIELDS[0].some((name) => error.fields[name])
                        ? 0
                        : STEP_FIELDS[1].some((name) => error.fields[name])
                            ? 1
                            : 2;
                    render(step);
                    showStepErrors(error.fields, null);
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
            return buildRoomStep();
        }
        if (step === 1) {
            return buildIdentityStep();
        }
        return buildGiftStep();
    }

    render(0);
}
