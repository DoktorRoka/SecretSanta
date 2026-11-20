# SecretSanta

Веб-приложение «Тайный Санта» для обмена подарками: комнаты по коду, анкеты
участников, честная жеребьёвка без самоподарков, кабинеты участников,
панель организатора и служебная панель суперадминистратора.

Стек: PHP 8.0+ (PDO + SQLite, опционально MySQL), HTML5, собственный CSS и
Vanilla JS на ES-модулях. Без фреймворков, Composer, npm-сборки, CDN и
внешних серверных процессов.

Корень сайта — каталог [`public_html/`](public_html/).

Полная документация: [допущения, деплой и список эндпоинтов](public_html/README.md).

## Быстрый старт

```bash
cp public_html/config.example.php public_html/config.php
php -S 127.0.0.1:8080 -t public_html
```

Затем откройте `http://127.0.0.1:8080/#/home`.

Требования, настройка `config.php`, деплой на Reg.ru и API описаны в
[`public_html/README.md`](public_html/README.md).
