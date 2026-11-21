/**
 * Футер сайта: автор проекта и ссылка на GitHub.
 *
 * Данные статичны, поэтому узел собирается один раз при загрузке страницы
 * и остаётся на всех экранах. Разметка — только через el()/icon().
 */

import { el } from './ui.js';
import { icon } from './icons.js';

const AUTHOR = {
    name: 'Калоша Максим Николаевич',
    role: 'Студент кафедры информатики и вычислительной техники',
    github: 'https://github.com/DoktorRoka',
};

export function authorPlate() {
    const link = el('a', {
        class: 'site-footer-link',
        href: AUTHOR.github,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'GitHub: DoktorRoka',
    }, [
        icon('github'),
        el('span', { text: 'DoktorRoka' }),
    ]);

    return el('footer', { class: 'site-footer' }, [
        el('div', { class: 'site-footer-inner' }, [
            el('div', { class: 'site-footer-author' }, [
                el('p', { class: 'site-footer-name', text: AUTHOR.name }),
                el('p', { class: 'site-footer-role', text: AUTHOR.role }),
            ]),
            link,
        ]),
    ]);
}
