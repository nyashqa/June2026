# 💖 Pinky Market

Анонимный маркетплейс ношеного белья (18+). Барби-розовый дизайн + Y2K-эстетика начала 2000-х: бегущие строки, мигающий текст, WordArt, блёстки, неон.

## Стек

| Часть      | Технологии                                              |
|------------|---------------------------------------------------------|
| `front/`   | Next.js 15 (App Router, TypeScript), чистый CSS, standalone-сборка |
| `backend/` | Go 1.23, stdlib `net/http`, pgx, JWT, bcrypt             |
| БД         | PostgreSQL 16                                            |

## Фичи

- **Анонимная регистрация в 1 клик** — без email/телефона. Бэкенд генерирует милый ник (`glitter_kitten_1337`) и пароль, показывает один раз.
- JWT-авторизация (токен на 30 дней).
- Каталог, карточка товара, создание лота, покупка, профиль с заказами.
- Миграции применяются автоматически при старте бэкенда.

## Деплой в Dokploy (отдельные сервисы)

Postgres создаётся отдельно (из шаблона Dokploy). Дальше два Application-сервиса из этого репо:

### 1. Backend
- Build type: **Dockerfile**, Docker File: `backend/Dockerfile`, Docker Context Path: `backend`
- Порт: `8080`
- Env:
  - `DATABASE_URL` — internal-строка подключения к твоему Postgres (вида `postgresql://postgres:***@host:5432/postgres`)
  - `JWT_SECRET` — случайная строка, **обязательно**
  - `CORS_ORIGIN` — опционально (при проксировании через фронт CORS не нужен)

### 2. Front
- Build type: **Dockerfile**, Docker File: `front/Dockerfile`, Docker Context Path: `front`
- Порт: `3000`
- Env (runtime):
  - `API_URL` — **внутренний** адрес бэкенда в докер-сети, напр. `http://yoonaproject-backend-xxxxx:8080`

> Браузер ходит только на домен фронта (`/api/...`), а Node-сервер Next.js проксирует запросы бэкенду (`front/app/api/[...path]/route.ts`). Поэтому бэкенду не нужен публичный домен, CORS не задействован, а `API_URL` — обычная runtime-переменная (никаких build-args).

Миграции БД применяются автоматически при старте бэкенда — отдельно ничего накатывать не надо.

## API

```
POST /api/auth/register      — анонимная регистрация (тело опционально)
POST /api/auth/login         — вход
GET  /api/me                 — текущий юзер          (Bearer)
GET  /api/products           — каталог
GET  /api/products/{id}      — лот
POST /api/products           — создать лот           (Bearer)
POST /api/products/{id}/buy  — купить                (Bearer)
GET  /api/orders             — мои покупки           (Bearer)
GET  /api/health             — healthcheck
```

## Локальный запуск (если вдруг захочется)

```bash
# postgres любой, потом:
cd backend && DATABASE_URL=postgres://... go run .
cd front && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```
