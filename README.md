# QuizLive — платформа интерактивных квизов

MVP веб-приложения для проведения квизов в реальном времени (организатор + участники).

## Возможности

- Регистрация организаторов и участников
- Конструктор квизов (одиночный/множественный выбор, текст и изображения)
- Live-сессии по коду комнаты (WebSocket / Socket.IO)
- Таймер на вопрос, блокировка ответов вне активного показа
- Подсчёт баллов (за скорость или за правильность)
- Лидерборд и история в личном кабинете

## Стек

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes + custom server
- **Realtime:** Socket.IO
- **БД:** SQLite + Prisma ORM

## Быстрый старт

```bash
cd quiz-platform
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Сценарий проверки

Подробный чеклист для группы пользователей: **[docs/TESTING.md](docs/TESTING.md)**

Быстрый старт теста:

```bash
npm run db:seed
npm run dev
```

1. Войдите как **organizer@demo.local** / `demo1234` → «Запустить» на демо-квизе
2. Скопируйте код комнаты
3. Участники: **player1@demo.local** … **player5@demo.local** / `demo1234` → `/join`
4. Организатор: «Начать квиз» → управляйте вопросами
5. Проверьте лидерборд и `/profile` у обеих ролей

## Структура

```
docs/design/     — user flow и спецификация экранов (Figma)
prisma/          — схема БД
src/app/         — страницы и API
src/server/      — Socket.IO
server.ts        — custom server (Next + WebSocket)
```

## Документация для сдачи

См. **[docs/REPORT.md](docs/REPORT.md)** — пояснительная записка (до 5 стр.).

## Ссылки (для пояснительной записки)

| Ресурс | URL |
|--------|-----|
| Пояснительная записка | [docs/REPORT.md](docs/REPORT.md) |
| Макеты Figma | [docs/design/FIGMA_LINK.md](docs/design/FIGMA_LINK.md) |
| Репозиторий | _указать GitHub URL после публикации_ |
| Рабочий продукт | http://localhost:3000 (`npm run dev`) |
| Деплой | _опционально_ |
