# Ссылки на макеты

| Ресурс | Ссылка |
|--------|--------|
| **UI-макеты (Figma Design)** | https://www.figma.com/design/FHmFlk5l3thkliNNvimv4v/QuizLive-UI |
| **User flow + состояния сессии (FigJam)** | https://www.figma.com/board/id49ARvuNaTOilBog0iYFu |

## Что создано

### FigJam (аналог Miro)
- **QuizLive User Flow** — путь организатора и участника от Landing до профиля
- **Live Session States** — диаграмма состояний: `LOBBY → QUESTION → REVEAL → FINISHED`

### Figma Design
- **Дизайн-токены** (`QuizLive Tokens`): primary, accent, background, surface, text, success, error
- **Экраны (готовы):**
  - `01 Landing` — hero, CTA «Создать квиз» / «Присоединиться»
  - `02 Auth` — регистрация с выбором роли (организатор / участник)
- **Экраны (по спецификации `SCREENS.md`, добавить вручную или продолжить через MCP):**
  - Dashboard, Quiz Editor, Host Lobby, Live Host, Join, Live Player, Profile

## Miro

MCP-интеграция с Miro в текущем окружении **не подключена**. Для user flow и архитектуры использован **FigJam** — функциональный эквивалент для этапа проектирования.

## Как продолжить

1. Откройте [QuizLive UI](https://www.figma.com/design/FHmFlk5l3thkliNNvimv4v/QuizLive-UI) и доработайте оставшиеся экраны по `SCREENS.md`
2. Или запросите продолжение генерации макетов через Cursor (Figma MCP) после сброса лимита Starter-плана
