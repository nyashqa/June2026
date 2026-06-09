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

## Деплой в Dokploy

Репозиторий заточен под docker-сборку, локально ничего ставить не нужно:

1. **Вариант Compose**: создай Compose-сервис, укажи репо — Dokploy подхватит `docker-compose.yml`.
2. **Вариант по отдельности**: три сервиса — Postgres (из шаблона), `./backend` (Dockerfile), `./front` (Dockerfile).

### Переменные окружения

| Переменная            | Где      | Что                                                  |
|-----------------------|----------|------------------------------------------------------|
| `POSTGRES_PASSWORD`   | db/backend | пароль Postgres                                    |
| `DATABASE_URL`        | backend  | `postgres://pinky:...@db:5432/pinky?sslmode=disable` |
| `JWT_SECRET`          | backend  | **обязательно поменяй** на случайную строку          |
| `CORS_ORIGIN`         | backend  | домен фронта, напр. `https://pinky.example.com`      |
| `NEXT_PUBLIC_API_URL` | front (build arg) | публичный URL бэкенда, напр. `https://api.pinky.example.com` |

> `NEXT_PUBLIC_API_URL` вшивается в бандл на этапе сборки — в Dokploy задай его как build-arg фронта.

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
docker compose up --build
# front:   http://localhost:3000
# backend: http://localhost:8080
```
