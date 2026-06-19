# HH Applicant Tool

Инструмент для работы с hh.ru: авторизация, просмотр резюме, поиск похожих
вакансий, отклики, история откликов, работодатели, контакты и настройки.

Backend/runtime написан на Go. Оригинальный frontend сохранен в `frontend/`,
собирается через Vite и в production отдается Go-сервером из `frontend/dist`.

## Требования

- Go 1.23+
- Node.js 22+ и npm для сборки frontend
- Docker и Docker Compose, если нужен запуск в контейнере

## Быстрый локальный запуск

Все команды ниже выполняются из корня проекта:

```sh
cd /Users/n1x9s/Developer/myprojects/hh_auto_apply
export CONFIG_DIR="$PWD/config"
mkdir -p "$CONFIG_DIR"
```

`CONFIG_DIR` указывает, где хранить токены и конфиг. Для этого проекта удобно
использовать `./config`, потому что Docker Compose тоже монтирует этот каталог
в контейнер.

Соберите frontend:

```sh
cd frontend
npm ci
npm run build
cd ..
```

Запустите Go web-сервер:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

Откройте:

```text
http://127.0.0.1:8080
```

Если порт занят, используйте другой:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8090
```

## Авторизация hh.ru

Сначала получите ссылку авторизации:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go auth-url
```

Откройте выведенную ссылку в браузере, выберите нужный аккаунт hh.ru и нажмите
продолжение. После этого браузер должен перейти на адрес вида:

```text
hhandroid://oauthresponse?code=...
```

Если Safari показывает ошибку `Safari cannot open the page because the address is invalid`,
это нормально: приложение перехватывает Android redirect вручную. Скопируйте
весь адрес `hhandroid://oauthresponse?code=...` и выполните:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go auth-code --url 'hhandroid://oauthresponse?code=...'
```

Можно передать только сам код:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go auth-code --code '...'
```

Проверьте, что токен работает:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go whoami
```

После успешной авторизации обновите страницу `http://127.0.0.1:8080`. Если
страница все еще пишет, что вы не авторизованы, перезапустите `serve` и
обновите страницу.

## Полный сценарий после авторизации

1. Откройте `http://127.0.0.1:8080`.
2. Перейдите в раздел `Резюме` и проверьте, что резюме загрузились.
3. Перейдите в `Вакансии`.
4. Выберите резюме в селекте сверху.
5. Дождитесь списка похожих вакансий.
6. Для проверки используйте одиночные отклики или dry run через CLI.
7. Автоотклики запускайте только после проверки выборки.

Полезные CLI-команды:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go list-resumes
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go update-resumes
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go call-api GET /me
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go apply-similar --dry-run --search 'golang' --pages 1 --per-page 20
```

Реальные отклики отправляются без `--dry-run`:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go apply-similar --search 'golang' --pages 1 --per-page 20
```

## Frontend dev-режим

Для разработки frontend удобнее запускать Go API и Vite отдельно.

Терминал 1 - Go API:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

Терминал 2 - Vite:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Откройте адрес, который напечатает Vite, обычно:

```text
http://127.0.0.1:5173
```

Vite проксирует `/api` на Go-сервер `http://127.0.0.1:8080`.

## Production build

Собрать бинарник:

```sh
go build -o hh-applicant-tool-go ./cmd/hh-applicant-tool-go
```

Собрать frontend и запустить собранный бинарник:

```sh
cd frontend
npm ci
npm run build
cd ..
CONFIG_DIR="$PWD/config" ./hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

Если static-файлы лежат не в `frontend/dist`, укажите путь явно:

```sh
CONFIG_DIR="$PWD/config" HH_STATIC_DIR="$PWD/frontend/dist" ./hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

## Docker

Сначала лучше пройти авторизацию локально с тем же `./config`:

```sh
export CONFIG_DIR="$PWD/config"
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go auth-url
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go auth-code --url 'hhandroid://oauthresponse?code=...'
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go whoami
```

Затем запустить только web-интерфейс:

```sh
docker compose up -d --build hh_web
docker compose logs -f hh_web
```

Web UI будет доступен на:

```text
http://127.0.0.1:8080
```

Можно выполнить авторизацию через контейнер:

```sh
docker compose run --rm hh_web auth-url
docker compose run --rm hh_web auth-code --url 'hhandroid://oauthresponse?code=...'
docker compose run --rm hh_web whoami
```

Останавливать контейнеры:

```sh
docker compose down
```

## Daemon

Daemon автоматически выполняет фоновые задачи:

- обновляет токен;
- обновляет резюме;
- отправляет отклики по похожим вакансиям.

Важно: `daemon` может отправлять реальные отклики. Не запускайте его до
проверки авторизации, резюме и dry run.

Локальный запуск:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go daemon --search 'golang' --apply-pages 3 --per-page 50
```

Запуск в Docker:

```sh
docker compose up -d --build hh_app
docker compose logs -f hh_app
```

## Конфиг

Основной файл:

```text
config/config.json
```

Токен сохраняется туда автоматически после `auth-code`. Дополнительно можно
задать параметры вручную:

```json
{
  "api_delay": 0.345,
  "user_agent": "",
  "proxy_url": "",
  "client_id": "",
  "client_secret": ""
}
```

Если `client_id` и `client_secret` не указаны, используются встроенные значения
Android-клиента hh.ru.

Поддерживаемые переменные окружения:

- `CONFIG_DIR` - путь к каталогу с `config.json`;
- `HH_PROFILE_ID` - подкаталог профиля внутри `CONFIG_DIR`;
- `HH_STATIC_DIR` - путь к собранному frontend;
- `HH_INSECURE_SKIP_TLS_VERIFY=1` - отключить TLS-проверку, использовать только
  для локальной диагностики.

## Проверки

Go-тесты:

```sh
GOCACHE="$PWD/.gocache" go test ./...
```

Frontend build:

```sh
cd frontend
npm ci
npm run build
```

Проверка Docker build:

```sh
docker compose build
```

## Частые проблемы

`Safari cannot open the page because the address is invalid`

Это ожидаемо для `hhandroid://oauthresponse?...`. Скопируйте весь redirect URL
и передайте его в `auth-code --url`.

Белый экран после обновления frontend

Сделайте жесткое обновление страницы: `Cmd + Shift + R`. Если не помогло,
перезапустите `serve` и откройте страницу заново.

`authorized`, но web UI все еще пишет `Не авторизован`

Обновите страницу. Если запущен старый процесс сервера, перезапустите:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8080
```

`npm ci` не скачивает зависимости

Проверьте интернет/DNS/npm registry. Без зависимостей frontend нельзя
пересобрать, но Go API и CLI можно запускать отдельно.

`listen tcp 127.0.0.1:8080: bind: address already in use`

Остановите старый процесс или выберите другой порт:

```sh
CONFIG_DIR="$PWD/config" go run ./cmd/hh-applicant-tool-go serve --host 127.0.0.1 --port 8090
```

## Документация

Дополнительные детали по Go-порту: [docs/go-port.md](docs/go-port.md).
