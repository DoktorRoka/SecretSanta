import { el } from '../ui.js';
import { icon } from '../icons.js';
import { helpButton } from '../help.js';
import { winterScene } from '../winter-scene.js';

function choiceCard(href, iconName, title, subtitle) {
    return el('a', { class: 'choice-card', href }, [
        el('span', { class: 'choice-icon', 'aria-hidden': 'true' }, [icon(iconName)]),
        el('span', { class: 'choice-title', text: title }),
        el('span', { class: 'choice-sub', text: subtitle }),
    ]);
}

export default function homeView(view) {
    const scene = winterScene();
    view.append(
        el('header', { class: 'hero' }, [
            el('h1', { class: 'hero-title', text: 'Тайный Санта' }),
            el('p', { class: 'hero-lede', text: 'Подарите праздник коллеге или одногруппнику' }),
            el('p', {
                class: 'lead',
                text: 'Создайте комнату, соберите участников и проведите жеребьёвку. Каждый увидит только своего получателя.',
            }),
        ]),
        el('div', { class: 'choice-grid' }, [
            choiceCard('#/role/student', 'cap', 'Я студент', 'Комната для группы'),
            choiceCard('#/role/teacher', 'board', 'Я преподаватель', 'Комната для кафедры'),
        ]),
        el('p', { class: 'center' }, [
            el('a', { class: 'text-link', href: '#/login', text: 'Уже участвую — войти' }),
        ]),
        el('div', { class: 'help-row' }, [helpButton('Как это работает')]),
        el('footer', { class: 'page-footer' }, [
            el('a', { class: 'muted-link', href: '#/admin', text: 'Я организатор' }),
        ]),
        scene.node,
    );

    return scene.destroy;
}
