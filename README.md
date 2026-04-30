# SameSite Cookie Visibility Test

Тестовый проект для сравнения поведения трёх типов куки в разных сценариях: `SameSite=Strict`, `SameSite=Lax` и `Partitioned` (CHIPS).

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
│  │ + 3 cookies: │  │ HTML     │  │ HTML     │  │ HTML (3     │  │
│  │  🔴 Strict   │  │ iframe→  │  │ iframe→  │  │  iframes)   │  │
│  │  🟡 Lax      │  │ example  │  │ example  │  │             │  │
│  │  🟢 CHIPS    │  │          │  │          │  │             │  │
│  └──────────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Что тестируется

Сайт `example.localhost` выставляет **три** сессионные куки:

| Кука | Атрибуты | Поведение |
|------|----------|-----------|
| 🔴 `session_id` | `SameSite=Strict; Secure` | Не отправляется в cross-site iframe ни при GET, ни при POST |
| 🟡 `lax_id` | `SameSite=Lax; Secure` | Отправляется при top-level GET, но не при cross-site POST и не в iframe |
| 🟢 `partitioned_id` | `SameSite=None; Secure; Partitioned` (CHIPS) | Отправляется всегда, автоматически партиционируется по top-frame origin |

### Ожидаемый результат

| Контекст | 🔴 Strict | 🟡 Lax | 🟢 Partitioned |
|----------|-----------|--------|----------------|
| Прямой доступ | ✅ Стабильная | ✅ Стабильная | ✅ Стабильная |
| iframe на site-a (F5) | ❌ Новая каждый раз | ❌ Новая каждый раз | ✅ Своя, стабильная |
| iframe на site-b (F5) | ❌ Новая каждый раз | ❌ Новая каждый раз | ✅ Своя, стабильная (≠ site-a) |
| POST в iframe | ❌ Не отправляется | ❌ Не отправляется | ✅ Отправляется |

### GET vs POST

На странице `example.localhost` есть кнопки **GET** и **POST** для проверки:

| Метод | 🔴 Strict | 🟡 Lax | 🟢 Partitioned |
|-------|-----------|--------|----------------|
| GET (same-site) | ✅ Да | ✅ Да | ✅ Да |
| POST (same-site) | ✅ Да | ✅ Да | ✅ Да |
| GET (cross-site iframe) | ❌ Нет | ❌ Нет | ✅ Да |
| POST (cross-site iframe) | ❌ Нет | ❌ Нет | ✅ Да |

## Запуск

```bash
# Добавить в /etc/hosts:
# 127.0.0.1 example.localhost site-a.localhost site-b.localhost dashboard.localhost

docker compose up --build
```

> ⚠️ **HTTPS обязателен**: все куки требуют `Secure` флага. Проект использует self-signed cert — при первом открытии браузер покажет предупреждение, нужно принять его.

## Доступ к проектам

| URL | Описание |
|-----|----------|
| https://example.localhost | Основной сайт, выставляет куки + кнопки GET/POST |
| https://site-a.localhost | Встраивает example в iframe |
| https://site-b.localhost | Встраивает example в iframe |
| https://dashboard.localhost | 🔬 Панель: все три контекста одновременно + сравнение |

## Файлы

- `example-app/` — Node.js backend (Express), выставляет 3 куки + GET/POST API
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
