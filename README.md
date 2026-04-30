# SameSite vs Partitioned Cookie Visibility Test

Тестовый проект для сравнения поведения обычной куки (`SameSite=Strict`) и partitioned куки (CHIPS) в разных сценариях.

## Архитектура

```
┌───────────────────────────────────────────────────────────────────┐
│                      nginx (port 443 SSL)                          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ example.     │  │ site-a.  │  │ site-b.  │  │ dashboard.   │  │
│  │ localhost    │  │ localhost│  │ localhost│  │ localhost    │  │
│  └──────┬───────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│         │               │              │               │           │
│  ┌──────▼───────┐  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐  │
│  │ Node.js API  │  │ static   │  │ static   │  │ static       │  │
│  │ + 2 cookies: │  │ HTML     │  │ HTML     │  │ HTML (3     │  │
│  │  🔴 session  │  │ iframe→  │  │ iframe→  │  │  iframes)   │  │
│  │  🟢 partition│  │ example  │  │ example  │  │             │  │
│  └──────────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Что тестируется

Сайт `example.localhost` выставляет **две** сессионные куки:

| Кука | Атрибуты | Поведение |
|------|----------|-----------|
| 🔴 `session_id` | `SameSite=Strict; Secure` | В cross-site iframe кука **не отправляется** → сервер каждый раз создаёт новую |
| 🟢 `partitioned_id` | `SameSite=None; Secure; Partitioned` (CHIPS) | Каждый top-frame origin получает **свою** куку, но внутри одного origin — кука **сохраняется** |

### Ожидаемый результат

| Контекст | 🔴 session_id | 🟢 partitioned_id |
|----------|---------------|-------------------|
| Прямой доступ | Стабильная сессия | Стабильная сессия |
| iframe на site-a (F5) | **Новая** каждый раз | **Своя, стабильная** |
| iframe на site-b (F5) | **Новая** каждый раз | **Своя, стабильная** (≠ site-a) |

## Запуск

```bash
# Добавить в /etc/hosts:
# 127.0.0.1 example.localhost site-a.localhost site-b.localhost dashboard.localhost

docker compose up --build
```

> ⚠️ **HTTPS обязателен**: partitioned куки требуют `Secure` флага. Проект использует self-signed cert — при первом открытии браузер покажет предупреждение, нужно принять его.

## Доступ к проектам

| URL | Описание |
|-----|----------|
| https://example.localhost | Основной сайт, выставляет куки |
| https://site-a.localhost | Встраивает example в iframe |
| https://site-b.localhost | Встраивает example в iframe |
| https://dashboard.localhost | 🔬 Панель: все три контекста одновременно + сравнение |

## Файлы

- `example-app/` — Node.js backend (Express), выставляет 2 куки
- `static-site/` — шаблонный статический сайт (site-a, site-b, dashboard)
- `nginx/` — reverse proxy для всех доменов (HTTPS)
- `docker-compose.yml` — оркестрация

## CHIPS (Cookies Having Independent Partitioned State)

Partitioned куки автоматически изолируются по top-frame origin:

```
site-a.localhost → partition key: site-a.localhost → кука ABC
site-b.localhost → partition key: site-b.localhost → кука DEF
```

Без CHIPS все iframe делили бы одну куку. С CHIPS каждый embedder получает свою, но внутри своего origin кука сохраняется между запросами.

Поддержка: Chrome 118+, Safari 17.2+, Firefox 126+
