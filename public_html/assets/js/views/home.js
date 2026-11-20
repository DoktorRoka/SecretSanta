import { el } from '../ui.js';

function choiceCard(href, emoji, title, subtitle) {
    return el('a', { class: 'choice-card', href }, [
        el('span', { class: 'choice-emoji', 'aria-hidden': 'true', text: emoji }),
        el('span', { class: 'choice-title', text: title }),
        el('span', { class: 'choice-sub', text: subtitle }),
    ]);
}

export default function homeView(view) {
    view.append(
        el('header', { class: 'hero' }, [
            el('p', { class: 'kicker', text: '🎄 Тайный Санта' }),
            el('h1', { class: 'hero-title', text: 'Подарите праздник коллеге или одногруппнику' }),
            el('p', {
                class: 'lead',
                text: 'Создайте комнату, соберите участников и проведите жеребьёвку. Каждый увидит только своего получателя.',
            }),
        ]),
        el('div', { class: 'choice-grid' }, [
            choiceCard('#/role/student', '🎓', 'Я студент', 'Комната для группы'),
            choiceCard('#/role/teacher', '👩‍🏫', 'Я преподаватель', 'Комната для кафедры'),
        ]),
        el('p', { class: 'center' }, [
            el('a', { class: 'text-link', href: '#/login', text: 'Уже участвую — войти' }),
        ]),
        el('footer', { class: 'page-footer' }, [
            el('a', { class: 'muted-link', href: '#/admin', text: 'Я организатор' }),
        ]),
    );
}