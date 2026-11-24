# Тайный Санта

Mobile-first веб-приложение для обмена подарками: организатор создаёт изолированную комнату по коду, участники заполняют анкеты, после жеребьёвки каждый видит только своего получателя. Организатор и суперадминистратор не видят пары «кто кому дарит».

Стек: PHP 8.0+ (PDO + SQLite, опционально MySQL), HTML5, собственный CSS, Vanilla JS (ES-модули). Без фреймворков, Composer, npm-сборки, CDN и внешних серверных процессов.

## Структура

```
public_html/                  корень сайта (www/<домен>/)
├─ index.html                 единственная страница, hash-роутинг
├─ .htaccess                  HTTPS, заголовки безопасности, запрет служебных файлов
├─ config.example.php         шаблон конфига
├─ config.php                 рабочий конфиг (не в репозитории)
├─ README.md                  этот файл
├─ assets/
│  ├─ css/style.css
│  ├─ js/ main.js router.js api.js ui.js icons.js help.js authors.js winter-scene.js validators.js
│  │  └─ views/ home.js role.js join.js create.js login.js recover.js
│  │            cabinet.js password.js admin.js super.js profile.js
│  └─ img/favicon.svg
├─ api/                       тонкие JSON-эндпоинты
│  ├─ session.php  room_check.php  room_create.php  register.php
│  ├─ login.php  logout.php  me.php  profile_update.php  password_change.php
│  ├─ recover.php
│  ├─ admin/  login.php  room.php  user_delete.php  draw.php
│  └─ super/  login.php  rooms.php  room_delete.php  room_reset_admin.php
│             draw.php  draw_reset.php  purge.php
├─ app/                       вся логика и защита; закрыт .htaccess
│  ├─ bootstrap.php  db.php  schema.sql  schema_mysql.sql
│  ├─ auth.php  validate.php  ratelimit.php  draw.php  response.php
└─ data/                      SQLite, сессии, лог; закрыт .htaccess
   └─ santa.sqlite            создаётся автоматически
```

## Локальный запуск

1. Скопируйте `public_html/config.example.php` в `public_html/config.php`.
2. Укажите `DB_PATH` и `SUPERADMIN_HASH` (см. ниже). Для локальной проверки можно оставить `FORCE_HTTPS=false`.
3. Запустите встроенный сервер из корня репозитория:

```bash
php -S 127.0.0.1:8080 -t public_html
```

Откройте `http://127.0.0.1:8080/#/home`.

Важно: встроенный сервер PHP не читает `.htaccess`, поэтому локально каталоги `app/` и `data/` не защищены веб-сервером. На хостинге их закрывают `.htaccess`-файлы, и это обязательно проверяется перед запуском (см. раздел «Деплой»).

Хеш пароля суперадминистратора:

```bash
php -r "echo password_hash('ВАШ_ПАРОЛЬ', PASSWORD_DEFAULT), PHP_EOL;"
```

## Деплой на Reg.ru (shared-хостинг)

1. В панели хостинга включите PHP 8.0+ (лучше 8.1–8.3) и расширения `pdo_sqlite` (или `pdo_mysql`) и `mbstring`.
2. Подключите бесплатный SSL-сертификат Let's Encrypt и дождитесь выпуска. Редирект на HTTPS задан в корневом `.htaccess`.
3. Загрузите **содержимое** `public_html/` в каталог домена (обычно `www/<домен>/`) по FTP или через файловый менеджер. `index.html` должен оказаться в корне.
4. Создайте `config.php` из `config.example.php`, заполните `SUPERADMIN_HASH` и параметры. Пароль суперадмина — не короче 12 символов.
5. Права: каталоги 755, файлы 644. `data/` и `data/sessions/` должны быть доступны PHP на запись. 777 не ставить.
6. Откройте сайт: БД и таблицы создаются автоматически при первом запросе к API. Отдельной установочной страницы нет.
7. Проверьте защиту: `/data/santa.sqlite`, `/data/error.log`, `/app/schema.sql`, `/config.php`, `/README.md` должны отдавать 403 или 404. Если файл скачивается — приложение запускать нельзя: вынесите `data/` и `config.php` выше корня сайта (путь к БД задаётся в `DB_PATH`).
8. Проверьте, что `http://` перенаправляется на `https://`, а ответы содержат заголовки безопасности и cookie `santa_sid` с флагами `HttpOnly`, `SameSite=Lax`, `Secure`.

Опционально: если позволяет `open_basedir`, вынесите `config.php` и `data/` за пределы корня сайта. Путь к конфигу читается только в `app/bootstrap.php`, путь к БД — `DB_PATH`, каталог сессий — рядом с БД.

### Резервные копии и данные

- Перед жеребьёвкой и сразу после неё скачайте `data/santa.sqlite` по FTP и храните приватно.
- Обновление: заливайте только изменённые файлы, не перезаписывая `config.php` и `data/`.
- После мероприятия нажмите «Очистить всё» в панели суперадмина и удалите файл БД.
- Собираются только данные анкеты (ФИО, группа/должность, контакт, пожелания, ссылка, альтернатива) и хеши паролей. Анкету видит только получатель подарка. На формах есть обязательное согласие на обработку персональных данных (ФЗ-152).

## Конфиг (`config.php`)

| Ключ | По умолчанию | Назначение |
| --- | --- | --- |
| `DB_DRIVER` | `sqlite` | `sqlite` или `mysql` |
| `DB_PATH` | `data/santa.sqlite` | путь к SQLite-файлу |
| `DB_DSN`, `DB_USER`, `DB_PASS` | — | только для MySQL |
| `SUPERADMIN_HASH` | заглушка | `password_hash(...)`; с заглушкой панель отключена (403) |
| `MIN_PARTICIPANTS` | `3` | минимум участников для жеребьёвки |
| `MAX_ROOMS` | `300` | лимит комнат |
| `MAX_USERS_PER_ROOM` | `200` | лимит участников комнаты |
| `ALLOW_EDIT_AFTER_DRAW` | `false` | правка анкеты после жеребьёвки |
| `SESSION_DAYS` | `7` | срок жизни сессии |
| `FORCE_HTTPS` | `true` | оставлен для совместимости; редирект делает `.htaccess` |
| `TRUST_PROXY_HEADERS` | `false` | доверять `X-Forwarded-For` / `X-Forwarded-Proto` |

## API

Формат: `{ok:true,data:{...}}` или `{ok:false,error:{code,message,fields?}}`, UTF-8, `Cache-Control: no-store`. POST требует `Content-Type: application/json` и заголовок `X-CSRF-Token` (токен выдаёт `GET /api/session.php`). Тело больше 16 КБ — 413.

| Метод и путь | Доступ | Вход | Результат |
| --- | --- | --- | --- |
| `GET /api/session.php` | аноним | — | `{csrf,user,radmin,super}` |
| `POST /api/room_check.php` | аноним + CSRF | `{code}` | `{type}` |
| `POST /api/room_create.php` | аноним + CSRF | `{role,code,admin_password,profile,consent,website}` | `{me,room,is_admin}` |
| `POST /api/register.php` | аноним + CSRF | `{role,code,profile,consent,website}` | `{me,room}` |
| `POST /api/login.php` | аноним + CSRF | `{code,contact,password}` | `{must_change_pass}` |
| `POST /api/logout.php` | любой + CSRF | — | `{}` |
| `GET /api/me.php` | участник | — | `{must_change_pass,me,room,recipient}` |
| `POST /api/profile_update.php` | участник + CSRF | `{wish,link,alternative}` | `{me}` |
| `POST /api/password_change.php` | участник + CSRF | `{old_password,new_password}` | `{}` |
| `POST /api/recover.php` | аноним + CSRF | `{code,contact,recovery,new_password}` | `{}` |
| `POST /api/admin/login.php` | аноним + CSRF | `{code,password}` | `{room}` |
| `GET /api/admin/room.php` | организатор | — | `{room,users}` |
| `POST /api/admin/user_delete.php` | организатор + CSRF | `{user_id}` | `{participants_count}` |
| `POST /api/admin/draw.php` | организатор + CSRF | `{confirm:true}` | `{status,participants_count}` |
| `POST /api/super/login.php` | аноним + CSRF | `{password}` | `{}` |
| `GET /api/super/rooms.php` | суперадмин | — | `{rooms:[...]}` |
| `POST /api/super/room_delete.php` | суперадмин + CSRF | `{room_id,confirm_code}` | `{}` |
| `POST /api/super/room_reset_admin.php` | суперадмин + CSRF | `{room_id}` | `{password}` |
| `POST /api/super/draw.php` | суперадмин + CSRF | `{room_id}` | `{status,participants_count}` |
| `POST /api/super/draw_reset.php` | суперадмин + CSRF | `{room_id,confirm_code}` | `{status:'open'}` |
| `POST /api/super/purge.php` | суперадмин + CSRF | `{confirm:'УДАЛИТЬ ВСЁ'}` | `{}` |

Восстановление доступа (`recover.php`) — единственный способ сменить забытый пароль участника: код комнаты + контакт + личное кодовое слово. При успехе пароль задаётся сразу (без принудительной смены), `auth_ver` участника растёт, а если это организатор — синхронно обновляется пароль панели и растёт `admin_auth_ver`. Ответ на любой неверный набор — одинаковый 401 `BAD_CREDENTIALS`. Организаторского сброса ПИН больше нет: организатор никогда не получает рабочий пароль участника. Сброс суперадмином (`super/room_reset_admin.php`) меняет только пароль панели — пароль кабинета он не заменяет, поэтому суперадмин не может войти под участником и увидеть его пару. Жеребьёвка (`admin/draw.php`, `super/draw.php`) увеличивает `auth_ver` всем участникам, поэтому все активные сессии участников сбрасываются и вход нужно выполнить заново.

Коды ошибок: `VALIDATION` (400), `UNAUTHORIZED` / `BAD_CREDENTIALS` (401), `FORBIDDEN` / `CSRF` / `PASSWORD_CHANGE_REQUIRED` (403), `NOT_FOUND` / `ROOM_NOT_FOUND` (404), `ROOM_CLOSED` / `ROOM_FULL` / `LOGIN_TAKEN` / `ROOM_EXISTS` / `ROOM_TYPE_MISMATCH` / `NOT_ENOUGH` / `ROOM_LIMIT` (409), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `RATE_LIMIT` (429 + `Retry-After`), `BUSY` (503), `SERVER` (500).

## Принятые допущения

1. `must_change_pass` блокирует 403 `PASSWORD_CHANGE_REQUIRED` только эндпоинты участника. Сессии организатора и суперадмина от этого флага не зависят. В интерфейсе при `must_change_pass` разрешён только экран `#/password` (с кнопкой «Выйти»), остальные маршруты перенаправляют на него.
2. Тело запроса больше 16 КБ отклоняется с 413 `PAYLOAD_TOO_LARGE` (по `Content-Length` и по фактической длине).
3. `room_probe` считает неудачные попытки с несуществующим/закрытым кодом или некорректным кодом при входе. Успешная проверка счётчик не увеличивает.
4. Превышение `MAX_ROOMS` возвращает 409 `ROOM_LIMIT` — отдельный код, не описанный в ТЗ явно.
5. `login_fail`, `admin_fail`, `super_fail` очищаются при успешном входе. `login_ip` не очищается, чтобы неудачные попытки с одного IP продолжали учитываться.
6. Ответ `GET /api/super/rooms.php` обёрнут в `{rooms:[...]}` для единого формата `{ok,data}`.
7. При создании комнаты и регистрации валидируются все поля сразу, включая анкету; порядок проверок: honeypot → rate-limit → существование комнаты/тип/статус → валидация → уникальность.
8. Ссылки принимаются только со схемами `http`/`https`, без пробелов, с доменом, без `user:pass@`; пустая строка допустима. На клиенте ссылка повторно проверяется и показывается вместе с hostname.
9. Контакт: Telegram приводится к `@lowercase`, телефон — к `+7…`/цифрам, `login` — только цифры для телефона и lowercase-имя для Telegram.
10. Время в БД — UTC строками `YYYY-MM-DD HH:MM:SS`; на клиенте даты показываются в локальном часовом поясе.
11. Пароль панели, сгенерированный суперадмином, показывается один раз; сам секрет не логируется — в журнал попадает только факт сброса (комната). Факт использования восстановления по кодовому слову тоже логируется без секретов. `Cache-Control: no-store` стоит на всех ответах API.
12. Снег на фоне — 14 CSS-снежинок без inline-стилей; при `prefers-reduced-motion` отключается.
13. `FORCE_HTTPS` не выполняет редирект в PHP: на хостинге его делает `.htaccess`; в PHP флаг используется только для `Secure`-cookie и HSTS.
14. Восстановление пароля участника — самообслуживание (`POST /api/recover.php`): код комнаты + контакт + личное кодовое слово, заданное при регистрации. Организаторского сброса ПИН нет вовсе, поэтому организатор никогда не получает рабочий пароль участника и не может войти под ним и увидеть его пару. Восстановление доступно до и после жеребьёвки и сразу задаёт новый пароль (принудительной смены нет). Неудачная попытка учитывается в бакете `recover_fail` (5 за 15 минут на пару код+контакт+IP) и в `login_ip`; ответ на любой неверный набор одинаковый — 401 `BAD_CREDENTIALS`.
15. Жеребьёвка увеличивает `auth_ver` всем участникам — их сессии становятся недействительными, после жеребьёвки вход выполняется заново. Это гасит и сессии, заранее собранные организатором.
16. У организатора один пароль на панель и кабинет: он хранится в `rooms.admin_pass_hash` и тем же значением дублируется в `users.pass_hash` организатора, на которого указывает `rooms.owner_user_id`. Смена пароля в кабинете (`password_change.php`) и восстановление по кодовому слову (`recover.php`) обновляют обе записи в одной транзакции и увеличивают `rooms.admin_auth_ver`, поэтому пароль панели и кабинета не расходятся, а ранее выданные сессии организатора отзываются. Сброс суперадмином — исключение: он меняет только `admin_pass_hash` и не трогает `users.pass_hash`, поэтому суперадмин не получает пароль кабинета и не может войти под участником-организатором и увидеть его пару. После такого сброса пароль кабинета остаётся прежним, а организатор снова сводит пароли вместе, сменив пароль в кабинете. Минимальная длина пароля организатора — 8 символов (как при создании комнаты), у обычного участника — 4. Участник задаёт свой пароль и кодовое слово при регистрации.
17. `db_ensure_columns()` при обновлении существующей БД добавляет колонки `rooms.owner_user_id` и `users.recovery_hash` и заполняет `owner_user_id` первым (по `id`) участником комнаты — именно он создаётся вместе с комнатой; так единый пароль снова работает и для комнат, созданных до обновления. Добавление колонок идемпотентно и устойчиво к параллельным запросам.
18. Кодовое слово (recovery) наследует длину пароля участника — 4–72 байта. Хранится только как `password_hash(...)` в `users.recovery_hash` и никогда не отдаётся в ответах API. У участников из БД, созданной до обновления, кодовое слово пустое (NULL): они не могут восстановить пароль самостоятельно. Организатор может удалить такого участника (пока комната `open`), после чего участник регистрируется заново и задаёт кодовое слово; для новых установок это неактуально.
19. Механика `must_change_pass` сохранена, но новых значений `1` больше никто не выставляет (организаторского сброса нет). Флаг остаётся только для записей, где он был выставлен ранее, и продолжает перенаправлять на экран `#/password`.

## Проверки безопасности

- SQL-инъекции: все запросы — `prepare`, значения только через плейсхолдеры; `SELECT *` отсутствует.
- XSS: хранение как текст, вывод только через `textContent`/`append`; нет `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, inline-скриптов и inline-стилей; CSP `script-src 'self'`.
- IDOR: `room_id`/`user_id` участника берутся из сессии; организатор работает только в своей комнате; `room_id` из запроса принимается только в `super/*` после `require_super()`.
- CSRF: `X-CSRF-Token` + `hash_equals`, `SameSite=Lax`, обязательный JSON.
- Перебор: 8 бакетов rate-limit, единый ответ и одинаковое время для неверного логина, пароля и кодового слова.
- Пароли: `password_hash(PASSWORD_DEFAULT)`; у организатора один пароль на панель и кабинет, пароль панели при сбросе суперадмином — 10 символов без похожих. Пароль участника восстанавливается только по его личному кодовому слову; организаторский сброс ПИН удалён.
- Сессии: `santa_sid`, strict mode, `HttpOnly`, `Secure`, `SameSite=Lax`, сверка `auth_ver` на каждом запросе, суперадмин — 2 часа.