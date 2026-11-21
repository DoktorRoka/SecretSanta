import { state } from '../api.js';
import { el, pageHeader } from '../ui.js';
import { icon } from '../icons.js';
import { helpButton } from '../help.js';

function actionCard(href, iconName, title, subtitle, primary = false) {
    return el('a', { class: 'action-card' + (primary ? ' action-card-primary' : ''), href }, [
        el('span', { class: 'action-icon', 'aria-hidden': 'true' }, [icon(iconName)]),
        el('span', { class: 'action-text' }, [
            el('span', { class: 'action-title', text: title }),
            el('span', { class: 'action-sub', text: subtitle }),
        ]),
        icon('arrowRight', 'action-arrow'),
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
            actionCard('#/join', 'key', 'Присоединиться по коду', 'Если организатор уже прислал код комнаты', true),
            actionCard('#/create', 'gift', 'Создать свою комнату', 'Вы станете организатором и сразу заполните анкету'),
            actionCard('#/login', 'door', 'Войти в кабинет', 'Если вы уже зарегистрировались'),
        ]),
        el('p', { class: 'hint center', text: 'Комната для студентов не примет преподавателя и наоборот.' }),
        el('div', { class: 'help-row' }, [helpButton('Как это работает')]),
    );
}
