import { state } from '../api.js';
import { el, pageHeader } from '../ui.js';

function actionCard(href, emoji, title, subtitle, primary = false) {
    return el('a', { class: 'action-card' + (primary ? ' action-card-primary' : ''), href }, [
        el('span', { class: 'action-emoji', 'aria-hidden': 'true', text: emoji }),
        el('span', { class: 'action-text' }, [
            el('span', { class: 'action-title', text: title }),
            el('span', { class: 'action-sub', text: subtitle }),
        ]),
        el('span', { class: 'action-arrow', 'aria-hidden': 'true', text: '→' }),
    ]);
}

export default function roleView(view, params) {
    const role = params.role;
    if (role !== 'student' && role !== 'teacher') {
        view.append(
            pageHeader('Роль не найдена', 'Выберите, кем вы участвуете.', '#/home'),
            el('p', { class: 'center' }, [
                el('a', { class: 'btn btn-primary', href: '#/home', text: 'На главную' }),
            ]),
        );
        return;
    }

    state.role = role;
    const label = role === 'student' ? 'Студент' : 'Преподаватель';

    view.append(
        pageHeader(label, 'Код комнаты вам сообщает организатор.', '#/home'),
        el('div', { class: 'stack' }, [
            actionCard('#/join', '🔑', 'Присоединиться по коду', 'Если организатор уже прислал код комнаты', true),
            actionCard('#/create', '🎁', 'Создать свою комнату', 'Вы станете организатором и сразу заполните анкету'),
            actionCard('#/login', '🚪', 'Войти в кабинет', 'Если вы уже зарегистрировались'),
        ]),
        el('p', { class: 'hint center', text: 'Комната для студентов не примет преподавателя и наоборот.' }),
    );
}