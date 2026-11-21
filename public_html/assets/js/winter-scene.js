/**
 * Пиксельная сценка для главной: Дед Мороз на снегу и ёлка с гирляндой.
 *
 * Стилизована под 8-битную графику: ограниченная палитра, чёрные контуры,
 * плоские заливки и дизеринг вместо полупрозрачности. Рисуется на <canvas>
 * в маленьком разрешении и растягивается CSS, поэтому остаётся пиксельной.
 * Используется только canvas 2D API: без innerHTML и inline-стилей.
 * Анимация останавливается при уходе со страницы (cleanup) и когда вкладка
 * скрыта; при prefers-reduced-motion рисуется статичный кадр.
 */

import { el } from './ui.js';

const W = 160;
const H = 100;

const PAL = {
    black: '#0d1524',
    sky: '#102a4c',
    skyDeep: '#0a1f3c',
    star: '#cfeaff',
    white: '#fbfdff',
    ice: '#c4e6f4',
    iceDeep: '#8cc4dd',
    red: '#d92b2b',
    redDark: '#8f1a1a',
    redLight: '#f25c4a',
    skin: '#f7c59a',
    skinLight: '#ffd9b5',
    skinDark: '#d68b64',
    nose: '#ef7a5a',
    gold: '#f8c83c',
    goldDark: '#b47808',
    tree: '#2f9e4f',
    treeDark: '#176b34',
    treeLight: '#68cf74',
    trunk: '#8a5a2b',
    trunkDark: '#563619',
    snow: '#eaf9ff',
    snowDeep: '#bfe3f2',
    snowShade: '#7fb2cf',
    hill: '#1d4468',
    hillDeep: '#173a5b',
    boot: '#39496b',
    bootLight: '#54688f',
    bootDark: '#222e47',
    belt: '#3a2431',
    mouth: '#7d1a2b',
};

const BULB_COLORS = ['#ffd24a', '#ff6078', '#5fe7d2', '#b9f7ff'];

const TREE_CX = 116;
const TREE_BASE = 92;
const TIERS = [
    { top: 36, height: 22, width: 30 },
    { top: 46, height: 24, width: 42 },
    { top: 58, height: 26, width: 54 },
];

const OUTLINE = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
];

const GARLAND = [];
for (const row of [
    { y: 56.5, from: -9, to: 9, count: 5 },
    { y: 68.5, from: -15, to: 15, count: 7 },
    { y: 82.5, from: -23, to: 23, count: 9 },
]) {
    for (let index = 0; index < row.count; index++) {
        const ratio = row.count === 1 ? 0.5 : index / (row.count - 1);
        GARLAND.push({ x: ratio * (row.to - row.from) + row.from, y: row.y });
    }
}

const STARS = [
    [12, 12], [33, 7], [52, 19], [71, 10], [88, 17],
    [104, 8], [121, 21], [138, 11], [148, 25], [63, 27],
];

const FLAKES = (() => {
    let seed = 20261231;
    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    const list = [];
    for (let index = 0; index < 24; index++) {
        list.push({
            x: random() * W,
            y: random() * (H + 24),
            speed: 5 + random() * 9,
            size: random() < 0.28 ? 2 : 1,
            phase: random() * Math.PI * 2,
        });
    }
    return list;
})();

let outlining = false;

function fill(ctx, color, x, y, width, height) {
    ctx.fillStyle = outlining ? PAL.black : color;
    ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.max(0, Math.round(width)),
        Math.max(0, Math.round(height)),
    );
}

function stepTriangle(ctx, cx, top, height, baseWidth, color) {
    for (let row = 0; row < height; row++) {
        const ratio = (row + 1) / height;
        const width = Math.max(1, Math.round(baseWidth * ratio));
        fill(ctx, color, cx - width / 2, top + row, width, 1);
    }
}

function drawSky(ctx, time) {
    fill(ctx, PAL.sky, 0, 0, W, H);
    fill(ctx, PAL.skyDeep, 0, 0, W, 2);
    STARS.forEach(([x, y], index) => {
        const twinkle = (index + Math.floor(time / 700)) % 3 !== 0;
        fill(ctx, twinkle ? PAL.star : PAL.iceDeep, x, y, 1, 1);
        if (twinkle && index % 4 === 0) {
            fill(ctx, PAL.star, x, y - 1, 1, 1);
            fill(ctx, PAL.star, x, y + 1, 1, 1);
        }
    });
}

function drawHills(ctx) {
    const hills = [
        { cx: 34, top: 76, height: 8, width: 86, color: PAL.hill },
        { cx: 126, top: 74, height: 10, width: 96, color: PAL.hillDeep },
    ];
    for (const hill of hills) {
        for (let row = 0; row < hill.height; row++) {
            const ratio = (row + 1) / hill.height;
            const width = Math.round(hill.width * ratio);
            fill(ctx, hill.color, hill.cx - width / 2, hill.top + row, width, 1);
        }
    }
}

function drawGround(ctx) {
    for (let x = 0; x < W; x++) {
        const top = 80 + Math.round(Math.sin(x / 11) * 1.6 + Math.sin(x / 4.7) * 1.1);
        fill(ctx, PAL.snow, x, top, 1, H - top);
        fill(ctx, PAL.snowDeep, x, top + 8, 1, H - top - 8);
        fill(ctx, PAL.white, x, top, 1, 1);
        if ((x + top) % 2 === 0) {
            fill(ctx, PAL.snowDeep, x, top + 7, 1, 1);
        }
    }
}

function drawDitherShadow(ctx, cx, y, width) {
    for (let row = 0; row < 3; row++) {
        const rowWidth = width - row * 4;
        for (let offset = 0; offset < rowWidth; offset++) {
            if ((offset + row) % 2 === 0) {
                fill(ctx, PAL.snowShade, cx - rowWidth / 2 + offset, y + row, 1, 1);
            }
        }
    }
}

function drawStarBody(ctx, cx, cy) {
    fill(ctx, PAL.gold, cx - 1, cy - 3, 3, 7);
    fill(ctx, PAL.gold, cx - 3, cy - 1, 7, 3);
}

function drawStar(ctx, cx, cy, time) {
    outlining = true;
    for (const [dx, dy] of OUTLINE) {
        drawStarBody(ctx, cx + dx, cy + dy);
    }
    outlining = false;
    drawStarBody(ctx, cx, cy);
    fill(ctx, PAL.skinLight, cx - 1, cy - 1, 3, 3);
    const sparkle = (time / 500) % 2 < 1;
    fill(ctx, sparkle ? PAL.white : PAL.gold, cx, cy, 1, 1);
    if (sparkle) {
        fill(ctx, PAL.star, cx - 4, cy, 1, 1);
        fill(ctx, PAL.star, cx + 4, cy, 1, 1);
        fill(ctx, PAL.star, cx, cy - 4, 1, 1);
        fill(ctx, PAL.star, cx, cy + 4, 1, 1);
    }
}

function drawGarland(ctx, cx, time) {
    GARLAND.forEach((bulb, index) => {
        const x = cx + bulb.x;
        const y = bulb.y;
        const hot = (index + Math.floor(time / 240)) % 4 === 0;
        fill(ctx, PAL.black, x - 1, y - 1, 4, 4);
        fill(ctx, hot ? PAL.white : BULB_COLORS[index % BULB_COLORS.length], x, y, 2, 2);
    });
}

function drawTreeBody(ctx, cx, baseY) {
    fill(ctx, PAL.trunk, cx - 4, baseY - 9, 8, 9);
    fill(ctx, PAL.trunkDark, cx + 2, baseY - 9, 2, 9);

    for (let index = TIERS.length - 1; index >= 0; index--) {
        const tier = TIERS[index];
        stepTriangle(ctx, cx, tier.top, tier.height, tier.width, PAL.treeDark);
        for (let row = 0; row < tier.height; row++) {
            const width = Math.round(tier.width * ((row + 1) / tier.height));
            const light = Math.max(1, Math.round(width * 0.5));
            fill(ctx, PAL.tree, cx - width / 2 + 1, tier.top + row, light - 1, 1);
        }
        const bottom = tier.top + tier.height - 1;
        fill(ctx, PAL.snow, cx - tier.width / 2 + 2, bottom - 1, tier.width - 4, 2);
        fill(ctx, PAL.white, cx - tier.width / 2 + 2, bottom - 1, Math.round((tier.width - 4) * 0.45), 1);
    }
}

function drawTree(ctx, cx, baseY, time) {
    outlining = true;
    for (const [dx, dy] of OUTLINE) {
        drawTreeBody(ctx, cx + dx, baseY + dy);
    }
    outlining = false;
    drawTreeBody(ctx, cx, baseY);
    drawStar(ctx, cx, 29, time);
    drawGarland(ctx, cx, time);
}

function drawSanta(ctx, sx, sy, time) {
    const blink = time % 4300 > 4100;
    const bob = Math.floor(time / 900) % 2;
    const y = sy + bob;

    // валенки
    fill(ctx, PAL.boot, sx + 8, y + 52, 6, 4);
    fill(ctx, PAL.boot, sx + 16, y + 52, 6, 4);
    fill(ctx, PAL.bootLight, sx + 8, y + 52, 6, 1);
    fill(ctx, PAL.bootLight, sx + 16, y + 52, 6, 1);
    fill(ctx, PAL.bootDark, sx + 8, y + 55, 6, 1);
    fill(ctx, PAL.bootDark, sx + 16, y + 55, 6, 1);

    // шуба: подол
    for (const [rowY, width] of [[44, 18], [45, 19], [46, 21], [47, 22], [48, 23], [49, 24]]) {
        fill(ctx, PAL.red, sx + 15 - width / 2, y + rowY, width, 1);
        fill(ctx, PAL.redDark, sx + 15 + width / 2 - 2, y + rowY, 2, 1);
    }
    fill(ctx, PAL.white, sx + 3, y + 50, 24, 2);
    fill(ctx, PAL.ice, sx + 3, y + 51, 24, 1);

    // шуба: стан
    fill(ctx, PAL.red, sx + 7, y + 31, 17, 1);
    fill(ctx, PAL.red, sx + 8, y + 32, 15, 12);
    fill(ctx, PAL.redDark, sx + 21, y + 32, 2, 12);
    fill(ctx, PAL.redLight, sx + 8, y + 32, 1, 12);

    // рукава и варежки
    fill(ctx, PAL.red, sx + 3, y + 32, 5, 10);
    fill(ctx, PAL.redDark, sx + 3, y + 32, 1, 10);
    fill(ctx, PAL.red, sx + 22, y + 32, 5, 10);
    fill(ctx, PAL.redDark, sx + 26, y + 32, 1, 10);
    fill(ctx, PAL.white, sx + 3, y + 39, 5, 2);
    fill(ctx, PAL.white, sx + 22, y + 39, 5, 2);
    fill(ctx, PAL.redDark, sx + 1, y + 41, 8, 1);
    fill(ctx, PAL.red, sx + 2, y + 41, 6, 3);
    fill(ctx, PAL.redDark, sx + 2, y + 44, 6, 1);
    fill(ctx, PAL.redDark, sx + 22, y + 41, 8, 1);
    fill(ctx, PAL.red, sx + 23, y + 41, 6, 3);
    fill(ctx, PAL.redDark, sx + 23, y + 44, 6, 1);

    // опушка по центру и пояс с пряжкой
    fill(ctx, PAL.white, sx + 14, y + 31, 3, 13);
    fill(ctx, PAL.ice, sx + 16, y + 31, 1, 13);
    fill(ctx, PAL.belt, sx + 8, y + 39, 15, 4);
    fill(ctx, PAL.gold, sx + 13, y + 39, 5, 4);
    fill(ctx, PAL.goldDark, sx + 14, y + 40, 3, 2);

    // воротник
    fill(ctx, PAL.white, sx + 7, y + 30, 17, 3);
    fill(ctx, PAL.ice, sx + 7, y + 32, 17, 1);

    // лицо
    fill(ctx, PAL.skin, sx + 9, y + 16, 13, 8);
    fill(ctx, PAL.skinDark, sx + 9, y + 23, 13, 1);
    fill(ctx, PAL.skin, sx + 8, y + 18, 1, 3);
    fill(ctx, PAL.skin, sx + 22, y + 18, 1, 3);

    // седые виски
    fill(ctx, PAL.white, sx + 8, y + 15, 2, 4);
    fill(ctx, PAL.white, sx + 21, y + 15, 2, 4);

    // борода
    fill(ctx, PAL.white, sx + 7, y + 19, 2, 7);
    fill(ctx, PAL.white, sx + 22, y + 19, 2, 7);
    const beard = [16, 18, 18, 17, 15, 12, 9, 6, 3];
    beard.forEach((width, index) => {
        fill(ctx, PAL.white, sx + 15 - width / 2, y + 23 + index, width, 1);
        fill(ctx, PAL.ice, sx + 15 + width / 2 - 2, y + 23 + index, 2, 1);
    });

    // брови
    fill(ctx, PAL.white, sx + 10, y + 17, 4, 1);
    fill(ctx, PAL.white, sx + 17, y + 17, 4, 1);

    // глаза
    if (blink) {
        fill(ctx, PAL.black, sx + 11, y + 19, 3, 1);
        fill(ctx, PAL.black, sx + 17, y + 19, 3, 1);
    } else {
        fill(ctx, PAL.black, sx + 11, y + 19, 2, 2);
        fill(ctx, PAL.black, sx + 17, y + 19, 2, 2);
        fill(ctx, PAL.white, sx + 11, y + 19, 1, 1);
        fill(ctx, PAL.white, sx + 17, y + 19, 1, 1);
    }

    // щёки и нос
    fill(ctx, PAL.skinDark, sx + 9, y + 21, 2, 1);
    fill(ctx, PAL.skinDark, sx + 20, y + 21, 2, 1);
    fill(ctx, PAL.nose, sx + 14, y + 20, 3, 2);
    fill(ctx, PAL.skinLight, sx + 14, y + 20, 2, 1);

    // усы и улыбка
    fill(ctx, PAL.white, sx + 10, y + 22, 4, 2);
    fill(ctx, PAL.white, sx + 17, y + 22, 4, 2);
    fill(ctx, PAL.mouth, sx + 14, y + 24, 3, 1);

    // шапка
    for (let row = 0; row < 9; row++) {
        const ratio = row / 8;
        const width = 4 + Math.round(ratio * 14);
        const cx = sx + 19 - Math.round(ratio * 5);
        fill(ctx, row >= 7 ? PAL.redDark : PAL.red, cx - width / 2, y + 4 + row, width, 1);
    }
    fill(ctx, PAL.redLight, sx + 15, y + 6, 2, 4);
    fill(ctx, PAL.white, sx + 5, y + 12, 20, 4);
    fill(ctx, PAL.ice, sx + 5, y + 15, 20, 1);
    fill(ctx, PAL.white, sx + 18, y + 0, 5, 4);
    fill(ctx, PAL.ice, sx + 22, y + 2, 1, 2);
}

function drawSantaOutlined(ctx, sx, sy, time) {
    outlining = true;
    for (const [dx, dy] of OUTLINE) {
        drawSanta(ctx, sx + dx, sy + dy, time);
    }
    outlining = false;
    drawSanta(ctx, sx, sy, time);
}

function drawFlakes(ctx, time) {
    for (const flake of FLAKES) {
        const y = ((flake.y + (time / 1000) * flake.speed) % (H + 24)) - 12;
        const x = flake.x + Math.sin(time * 0.0007 + flake.phase) * 2.2;
        fill(ctx, PAL.white, x, y, flake.size, flake.size);
    }
}

function drawScene(ctx, time) {
    drawSky(ctx, time);
    drawHills(ctx);
    drawGround(ctx);
    drawDitherShadow(ctx, 42, 89, 30);
    drawDitherShadow(ctx, TREE_CX, 90, 44);
    drawTree(ctx, TREE_CX, TREE_BASE, time);
    drawSantaOutlined(ctx, 27, 34, time);
    drawFlakes(ctx, time);
}

export function winterScene() {
    const wrap = el('div', {
        class: 'winter-scene',
        role: 'img',
        'aria-label': 'Пиксельные Дед Мороз на снегу и ёлка с гирляндой',
    });
    const canvas = el('canvas', {
        class: 'winter-scene-canvas',
        width: W,
        height: H,
        'aria-hidden': 'true',
    });
    wrap.append(canvas);

    const ctx = canvas.getContext('2d');
    const reduce = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    let frame = 0;
    let startedAt = 0;
    let running = false;
    let stopped = false;

    function paint(time) {
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = false;
        outlining = false;
        drawScene(ctx, time);
    }

    function tick(now) {
        if (!running) {
            return;
        }
        if (!startedAt) {
            startedAt = now;
        }
        paint(now - startedAt);
        frame = window.requestAnimationFrame(tick);
    }

    function start() {
        if (running || stopped || reduce || !ctx) {
            return;
        }
        running = true;
        startedAt = 0;
        frame = window.requestAnimationFrame(tick);
    }

    function stop() {
        running = false;
        if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
        }
    }

    function onVisibility() {
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    }

    paint(reduce ? 700 : 0);
    if (ctx && !reduce) {
        start();
        document.addEventListener('visibilitychange', onVisibility);
    }

    return {
        node: wrap,
        destroy() {
            stopped = true;
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        },
    };
}