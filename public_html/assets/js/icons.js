/**
 * Набор SVG-иконок приложения.
 *
 * Иконки собираются только через createElementNS (без innerHTML) и
 * раскрашиваются через CSS-переменные, чтобы попадать под CSP
 * `script-src 'self'` и запрет inline-стилей.
 */

const NS = 'http://www.w3.org/2000/svg';

const ICONS = {
    tree: {
        parts: [
            { t: 'path', class: 'ic-1', d: 'M12 2.3 7.1 8.6h2.6l-3.9 5.3h3.2L5.4 19.3h13.2l-3.6-5.4h3.2l-3.9-5.3h2.6z' },
            { t: 'rect', class: 'ic-1', x: '10.7', y: '19.1', width: '2.6', height: '2.5', rx: '0.6' },
        ],
    },
    cap: {
        parts: [
            { t: 'path', class: 'ic-1', d: 'M12 3 1.6 8.1 12 13.2l10.4-5.1z' },
            { t: 'path', class: 'ic-2', d: 'M6.3 10.9v3.9c0 1.6 2.6 2.9 5.7 2.9s5.7-1.3 5.7-2.9v-3.9L12 13.6z' },
            { t: 'path', class: 'ic-line', d: 'M22.3 8.6v4.6' },
        ],
    },
    board: {
        parts: [
            { t: 'rect', class: 'ic-line', x: '2.6', y: '4', width: '18.8', height: '12.2', rx: '2' },
            { t: 'path', class: 'ic-line', d: 'M12 16.2v3.4' },
            { t: 'path', class: 'ic-line', d: 'M9 19.6h6' },
            { t: 'path', class: 'ic-line', d: 'M6.3 7.4h8.4' },
            { t: 'path', class: 'ic-line', d: 'M6.3 10.8h5.4' },
        ],
    },
    key: {
        parts: [
            { t: 'circle', class: 'ic-line', cx: '8.4', cy: '8.4', r: '3.6' },
            { t: 'circle', class: 'ic-line', cx: '8.4', cy: '8.4', r: '1.4' },
            { t: 'path', class: 'ic-line', d: 'M11 11 19.8 19.8' },
            { t: 'path', class: 'ic-line', d: 'M15.8 18.2l2.4-2.4' },
        ],
    },
    gift: {
        parts: [
            { t: 'rect', class: 'ic-1', x: '3.2', y: '9.8', width: '17.6', height: '10.4', rx: '1.8' },
            { t: 'rect', class: 'ic-1', x: '2.4', y: '6.6', width: '19.2', height: '3.6', rx: '1.2' },
            { t: 'rect', class: 'ic-2', x: '10.7', y: '6.6', width: '2.6', height: '13.6' },
            { t: 'path', class: 'ic-2', d: 'M12 6.6c-1.5 0-3.6-.7-3.6-2.3 0-.9.8-1.6 1.7-1.6C11.4 2.7 12 4.3 12 6.6z' },
            { t: 'path', class: 'ic-2', d: 'M12 6.6c1.5 0 3.6-.7 3.6-2.3 0-.9-.8-1.6-1.7-1.6C12.6 2.7 12 4.3 12 6.6z' },
        ],
    },
    door: {
        parts: [
            { t: 'rect', class: 'ic-1', x: '5', y: '2.4', width: '12.6', height: '19.2', rx: '1.6' },
            { t: 'circle', class: 'ic-2', cx: '14.2', cy: '12', r: '1.3' },
        ],
    },
    dice: {
        parts: [
            { t: 'rect', class: 'ic-line', x: '3.6', y: '3.6', width: '16.8', height: '16.8', rx: '4' },
            { t: 'circle', class: 'ic-pip', cx: '8.4', cy: '8.4', r: '1.5' },
            { t: 'circle', class: 'ic-pip', cx: '15.6', cy: '8.4', r: '1.5' },
            { t: 'circle', class: 'ic-pip', cx: '12', cy: '12', r: '1.5' },
            { t: 'circle', class: 'ic-pip', cx: '8.4', cy: '15.6', r: '1.5' },
            { t: 'circle', class: 'ic-pip', cx: '15.6', cy: '15.6', r: '1.5' },
        ],
    },
    snowflake: {
        parts: [
            { t: 'path', class: 'ic-line', d: 'M12 2v20' },
            { t: 'path', class: 'ic-line', d: 'M3.3 7l17.4 10' },
            { t: 'path', class: 'ic-line', d: 'M20.7 7 3.3 17' },
        ],
    },
    bell: {
        parts: [
            { t: 'path', class: 'ic-1', d: 'M12 2.2c-3.4 0-5.7 2.5-5.7 5.9v3.3L4.6 14.6c-.5.9.1 2 1.1 2h12.6c1 0 1.6-1.1 1.1-2l-1.7-3.2V8.1c0-3.4-2.3-5.9-5.7-5.9z' },
            { t: 'path', class: 'ic-2', d: 'M9.8 18.4a2.3 2.3 0 0 0 4.4 0z' },
        ],
    },
    close: {
        parts: [
            { t: 'path', class: 'ic-line', d: 'M6.5 6.5 17.5 17.5' },
            { t: 'path', class: 'ic-line', d: 'M17.5 6.5 6.5 17.5' },
        ],
    },
    info: {
        parts: [
            { t: 'circle', class: 'ic-line', cx: '12', cy: '12', r: '8.8' },
            { t: 'path', class: 'ic-line', d: 'M12 10.9v5.4' },
            { t: 'circle', class: 'ic-pip', cx: '12', cy: '7.6', r: '1.15' },
        ],
    },
    arrowLeft: {
        parts: [
            { t: 'path', class: 'ic-line', d: 'M19 12H5' },
            { t: 'path', class: 'ic-line', d: 'M11 6l-6 6 6 6' },
        ],
    },
    arrowRight: {
        parts: [
            { t: 'path', class: 'ic-line', d: 'M5 12h14' },
            { t: 'path', class: 'ic-line', d: 'M13 6l6 6-6 6' },
        ],
    },
};

export function icon(name, className = '') {
    const def = ICONS[name];
    if (!def) {
        return document.createTextNode('');
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', className ? 'ic ' + className : 'ic');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (const part of def.parts) {
        const node = document.createElementNS(NS, part.t);
        for (const [key, value] of Object.entries(part)) {
            if (key === 't') {
                continue;
            }
            node.setAttribute(key, String(value));
        }
        svg.append(node);
    }
    return svg;
}
