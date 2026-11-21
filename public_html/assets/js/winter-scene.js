/**
 * Пиксельная сценка для главной: Дед Мороз на снегу и ёлка с гирляндой.
 *
 * Рисуется на <canvas> в маленьком разрешении и растягивается CSS, поэтому
 * остаётся пиксельной. Используется только canvas 2D API: без innerHTML
 * и inline-стилей. Анимация останавливается при уходе со страницы (cleanup)
 * и когда вкладка скрыта; при prefers-reduced-motion рисуется статичный кадр.
 */

import { el } from './ui.js';

const W = 160;
const H = 100;

const COLOR = {
    red: '#cf2f47',
    redDark: '#9f1e31',
    redLight: '#e85a6e',
    fur: '#f3fbff',
    furDark: '#cfe6f4',
    skin: '#f7c9a8',
    skinDark: '#e3a884',
    nose: '#e78f75',
    ink: '#1d2c3a',
    gold: '#f4bb33',
    goldDark: '#c58a16',
    boot: '#2c4056',
    bootLight: '#415d78',
    bootSole: '#1d2a38',
    tree: '#1e8a5a',
    treeDark: '#116b45',
    trunk: '#6b4630',
    trunkLight: '#8c5f42',
    trunkDark: '#4c3121',
    snow: '#e8f7ff',
    snowDeep: '#d2ecfa',
    snowLine: '#ffffff',
    shadow: 'rgba(42, 88, 124, 0.16)',
    starSpark: 'rgba(255, 233, 163, 0.9)',
};

const BULB_COLORS = ['#ffd24a', '#ff6078', '#5fe7d2', '#b9f7ff'];
const BULB_GLOWS = [
    'rgba(255, 210, 74, 0.30)',
    'rgba(255, 96, 120, 0.30)',
    'rgba(95, 231, 210, 0.30)',
    'rgba(185, 247, 255, 0.30)',
];

const TREE_CX = 116;
const TREE_BASE = 92;
const TIERS = [
    { top: 36, height: 22, width: 30 },
    { top: 46, height: 24, width: 42 },
    { top: 58, height: 26, width: 54 },
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

const FLAKES = (() => {
    let seed = 20261231;
    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    const list = [];
    for (let index = 0; index < 26; index++) {
        list.push({
            x: random() * W,
            y: random() * (H + 24),
            speed: 5 + random() * 9,
            size: random() < 0.28 ? 2 : 1,
            alpha: 0.35 + random() * 0.5,
            phase: random() * Math.PI * 2,
        });
    }
    return list;
})();

function fill(ctx, color, x, y, width, height) {
    ctx.fillStyle = color;
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

function drawHills(ctx) {
    const hills = [
        { cx: 34, top: 76, height: 8, width: 86, color: 'rgba(176, 222, 244, 0.42)' },
        { cx: 126, top: 74, height: 10, width: 96, color: 'rgba(196, 232, 248, 0.38)' },
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
        fill(ctx, COLOR.snow, x, top, 1, H - top);
        fill(ctx, COLOR.snowDeep, x, top + 8, 1, H - top - 8);
        fill(ctx, COLOR.snowLine, x, top, 1, 1);
    }
}

function drawShadow(ctx, cx, y, width) {
    fill(ctx, COLOR.shadow, cx - width / 2, y, width, 3);
    fill(ctx, COLOR.shadow, cx - width / 2 + 3, y + 3, width - 6, 1);
}

function drawTree(ctx, cx, baseY, time) {
    fill(ctx, COLOR.trunk, cx - 4, baseY - 9, 8, 9);
    fill(ctx, COLOR.trunkLight, cx - 4, baseY - 9, 3, 9);
    fill(ctx, COLOR.trunkDark, cx + 2, baseY - 9, 2, 9);

    for (let index = TIERS.length - 1; index >= 0; index--) {
        const tier = TIERS[index];
        stepTriangle(ctx, cx, tier.top, tier.height, tier.width, COLOR.treeDark);
        for (let row = 0; row < tier.height; row++) {
            const width = Math.round(tier.width * ((row + 1) / tier.height));
            const light = Math.max(1, Math.round(width * 0.5));
            fill(ctx, COLOR.tree, cx - width / 2 + 1, tier.top + row, light - 1, 1);
        }
        const bottom = tier.top + tier.height - 1;
        fill(ctx, COLOR.snow, cx - tier.width / 2 + 2, bottom - 1, tier.width - 4, 2);
        fill(
            ctx,
            COLOR.snowLine,
            cx - tier.width / 2 + 2,
            bottom - 1,
            Math.round((tier.width - 4) * 0.45),
            1,
        );
    }

    const sparkle = (time / 500) % 2 < 1;
    if (sparkle) {
        fill(ctx, COLOR.starSpark, cx - 4, 29, 1, 1);
        fill(ctx, COLOR.starSpark, cx + 4, 29, 1, 1);
        fill(ctx, COLOR.starSpark, cx, 25, 1, 1);
        fill(ctx, COLOR.starSpark, cx, 33, 1, 1);
    }
    const starColor = sparkle ? COLOR.gold : '#ffe9a3';
    fill(ctx, starColor, cx - 1, 26, 3, 7);
    fill(ctx, starColor, cx - 3, 28, 7, 3);
    fill(ctx, '#fff7d6', cx - 1, 28, 3, 3);

    GARLAND.forEach((bulb, index) => {
        const colorIndex = index % BULB_COLORS.length;
        const x = cx + bulb.x;
        const hot = (index + Math.floor(time / 240)) % 4 === 0;
        fill(ctx, BULB_GLOWS[colorIndex], x - 1, bulb.y - 1, 4, 4);
        if (hot) {
            fill(ctx, 'rgba(255, 255, 255, 0.3)', x - 1, bulb.y - 1, 4, 4);
        }
        fill(ctx, BULB_COLORS[colorIndex], x, bulb.y, 2, 2);
        fill(ctx, hot ? '#ffffff' : '#fff7e0', x, bulb.y, 1, 1);
    });
}

function drawSanta(ctx, sx, sy, time) {
    const blink = time % 4300 > 4100;
    const bob = Math.floor(time / 900) % 2;
    const y = sy + bob;

    // валенки
    fill(ctx, COLOR.boot, sx + 8, y + 52, 6, 4);
    fill(ctx, COLOR.boot, sx + 16, y + 52, 6, 4);
    fill(ctx, COLOR.bootLight, sx + 8, y + 52, 6, 1);
    fill(ctx, COLOR.bootLight, sx + 16, y + 52, 6, 1);
    fill(ctx, COLOR.bootSole, sx + 8, y + 55, 6, 1);
    fill(ctx, COLOR.bootSole, sx + 16, y + 55, 6, 1);

    // шуба: подол
    for (const [rowY, width] of [[44, 18], [45, 19], [46, 21], [47, 22], [48, 23], [49, 24]]) {
        fill(ctx, COLOR.red, sx + 15 - width / 2, y + rowY, width, 1);
        fill(ctx, COLOR.redDark, sx + 15 + width / 2 - 2, y + rowY, 2, 1);
    }
    fill(ctx, COLOR.fur, sx + 3, y + 50, 24, 2);
    fill(ctx, COLOR.furDark, sx + 3, y + 51, 24, 1);

    // шуба: стан
    fill(ctx, COLOR.red, sx + 7, y + 31, 17, 1);
    fill(ctx, COLOR.red, sx + 8, y + 32, 15, 12);
    fill(ctx, COLOR.redDark, sx + 21, y + 32, 2, 12);
    fill(ctx, COLOR.redLight, sx + 8, y + 32, 1, 12);

    // рукава и варежки
    fill(ctx, COLOR.red, sx + 3, y + 32, 5, 10);
    fill(ctx, COLOR.redDark, sx + 3, y + 32, 1, 10);
    fill(ctx, COLOR.red, sx + 22, y + 32, 5, 10);
    fill(ctx, COLOR.redDark, sx + 26, y + 32, 1, 10);
    fill(ctx, COLOR.fur, sx + 3, y + 39, 5, 2);
    fill(ctx, COLOR.fur, sx + 22, y + 39, 5, 2);
    fill(ctx, COLOR.redDark, sx + 1, y + 41, 8, 1);
    fill(ctx, COLOR.red, sx + 2, y + 41, 6, 3);
    fill(ctx, COLOR.redDark, sx + 2, y + 44, 6, 1);
    fill(ctx, COLOR.redDark, sx + 22, y + 41, 8, 1);
    fill(ctx, COLOR.red, sx + 23, y + 41, 6, 3);
    fill(ctx, COLOR.redDark, sx + 23, y + 44, 6, 1);

    // опушка по центру и пояс с пряжкой
    fill(ctx, COLOR.fur, sx + 14, y + 31, 3, 13);
    fill(ctx, COLOR.furDark, sx + 16, y + 31, 1, 13);
    fill(ctx, '#3c2a33', sx + 8, y + 39, 15, 4);
    fill(ctx, COLOR.gold, sx + 13, y + 39, 5, 4);
    fill(ctx, COLOR.goldDark, sx + 14, y + 40, 3, 2);

    // воротник
    fill(ctx, COLOR.fur, sx + 7, y + 30, 17, 3);
    fill(ctx, COLOR.furDark, sx + 7, y + 32, 17, 1);

    // лицо
    fill(ctx, COLOR.skin, sx + 9, y + 16, 13, 8);
    fill(ctx, COLOR.skinDark, sx + 9, y + 23, 13, 1);
    fill(ctx, COLOR.skin, sx + 8, y + 18, 1, 3);
    fill(ctx, COLOR.skin, sx + 22, y + 18, 1, 3);

    // седые виски
    fill(ctx, COLOR.fur, sx + 8, y + 15, 2, 4);
    fill(ctx, COLOR.fur, sx + 21, y + 15, 2, 4);

    // борода
    fill(ctx, COLOR.fur, sx + 7, y + 19, 2, 7);
    fill(ctx, COLOR.fur, sx + 22, y + 19, 2, 7);
    const beard = [16, 18, 18, 17, 15, 12, 9, 6, 3];
    beard.forEach((width, index) => {
        fill(ctx, COLOR.fur, sx + 15 - width / 2, y + 23 + index, width, 1);
        fill(ctx, COLOR.furDark, sx + 15 + width / 2 - 2, y + 23 + index, 2, 1);
    });

    // брови
    fill(ctx, COLOR.fur, sx + 10, y + 17, 4, 1);
    fill(ctx, COLOR.fur, sx + 17, y + 17, 4, 1);

    // глаза
    if (blink) {
        fill(ctx, COLOR.ink, sx + 11, y + 19, 3, 1);
        fill(ctx, COLOR.ink, sx + 17, y + 19, 3, 1);
    } else {
        fill(ctx, COLOR.ink, sx + 11, y + 19, 2, 2);
        fill(ctx, COLOR.ink, sx + 17, y + 19, 2, 2);
        fill(ctx, '#ffffff', sx + 11, y + 19, 1, 1);
        fill(ctx, '#ffffff', sx + 17, y + 19, 1, 1);
    }

    // щёки и нос
    fill(ctx, '#f0ab93', sx + 9, y + 21, 2, 1);
    fill(ctx, '#f0ab93', sx + 20, y + 21, 2, 1);
    fill(ctx, COLOR.nose, sx + 14, y + 20, 3, 2);
    fill(ctx, '#f9d8c6', sx + 14, y + 20, 2, 1);

    // усы и улыбка
    fill(ctx, '#ffffff', sx + 10, y + 22, 4, 2);
    fill(ctx, '#ffffff', sx + 17, y + 22, 4, 2);
    fill(ctx, '#8d2630', sx + 14, y + 24, 3, 1);

    // шапка
    for (let row = 0; row < 9; row++) {
        const ratio = row / 8;
        const width = 4 + Math.round(ratio * 14);
        const cx = sx + 19 - Math.round(ratio * 5);
        fill(ctx, row >= 7 ? COLOR.redDark : COLOR.red, cx - width / 2, y + 4 + row, width, 1);
    }
    fill(ctx, COLOR.redLight, sx + 15, y + 6, 2, 4);
    fill(ctx, COLOR.fur, sx + 5, y + 12, 20, 4);
    fill(ctx, COLOR.furDark, sx + 5, y + 15, 20, 1);
    fill(ctx, COLOR.fur, sx + 18, y + 0, 5, 4);
    fill(ctx, '#ffffff', sx + 19, y + 1, 2, 2);
    fill(ctx, COLOR.furDark, sx + 22, y + 2, 1, 2);
}

function drawFlakes(ctx, time) {
    ctx.fillStyle = '#ffffff';
    for (const flake of FLAKES) {
        const y = ((flake.y + (time / 1000) * flake.speed) % (H + 24)) - 12;
        const x = flake.x + Math.sin(time * 0.0007 + flake.phase) * 2.2;
        ctx.globalAlpha = flake.alpha;
        ctx.fillRect(Math.round(x), Math.round(y), flake.size, flake.size);
    }
    ctx.globalAlpha = 1;
}

function drawScene(ctx, time) {
    drawHills(ctx);
    drawGround(ctx);
    drawShadow(ctx, 42, 89, 30);
    drawShadow(ctx, TREE_CX, 90, 44);
    drawTree(ctx, TREE_CX, TREE_BASE, time);
    drawSanta(ctx, 27, 34, time);
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