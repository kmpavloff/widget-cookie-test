# SameSite Cookie Visibility Test

Тестовый проект для сравнения поведения четырёх типов куки в разных сценариях: `SameSite=Strict`, `SameSite=Lax`, `SameSite=None` (unpartitioned) и `Partitioned` (CHIPS).

## Архитектура

```
┌───────────────────────────────────────────────────────────────────┐
│                      nginx (port 443 SSL)                         │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ example.     │  │ site-a.  │  │ site-b.  │  │ dashboard.   │   │
│  │ localhost    │  │ localhost│  │ localhost│  │ localhost    │   │
│  └──────┬───────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│         │               │             │               │           │
│  ┌──────▼───────┐  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐   │
│  │ Node.js API  │  │ static   │  │ static   │  │ static       │   │
│  │ + 4 cookies: │  │ HTML     │  │ HTML     │  │ HTML (4      │   │
│  │  🔴 Strict   │  │ iframe→  │  │ iframe→  │  │  iframes)    │   │
│  │  🟡 Lax      │  │ example  │  │ example  │  │              │   │
│  │  🟢 CHIPS    │  │          │  │          │  │              │   │
│  │  🔵 None     │  │          │  │          │  │              │   │
│  └──────────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## Что тестируется

Сайт `example.localhost` выставляет **четыре** сессионные куки:

| Кука | Атрибуты | Поведение |
|------|----------|-----------|
| 🔴 `session_id` | `SameSite=Strict; Secure` | Не отправляется в cross-site iframe ни при GET, ни при POST |
| 🟡 `lax_id` | `SameSite=Lax; Secure` | Отправляется при **top-level** cross-site GET (клик по ссылке), но **не** в iframe и **не** при cross-site POST |
| 🟢 `partitioned_id` | `SameSite=None; Secure; Partitioned` (CHIPS) | Отправляется всегда, автоматически партиционируется по top-frame origin |
| 🔵 `none_id` | `SameSite=None; Secure` (без Partitioned) | Отправляется всегда, **одна общая кука** для всех origin |

### Ожидаемый результат

| Контекст | 🔴 Strict | 🟡 Lax | 🟢 Partitioned | 🔵 None |
|----------|-----------|--------|----------------|----------|
| Прямой доступ | ✅ Стабильная | ✅ Стабильная | ✅ Стабильная | ✅ Стабильная |
| iframe на site-a (F5) | ❌ Новая каждый раз | ❌ Новая каждый раз (iframe) | ✅ Своя, стабильная | ✅ Та же (общая) |
| iframe на site-b (F5) | ❌ Новая каждый раз | ❌ Новая каждый раз (iframe) | ✅ Своя, стабильная (≠ site-a) | ✅ Та же (общая) |
| top-level GET (клик по ссылке) | ❌ Новая каждый раз | ✅ Та же кука (Lax работает!) | ✅ Своя, стабильная | ✅ Та же (общая) |
| POST в iframe | ❌ Не отправляется | ❌ Не отправляется | ✅ Отправляется | ✅ Отправляется |

### GET vs POST

На странице `example.localhost` есть кнопки **GET** и **POST** для проверки:

| Метод | 🔴 Strict | 🟡 Lax | 🟢 Partitioned | 🔵 None |
|-------|-----------|--------|----------------|----------|
| GET (same-site) | ✅ Да | ✅ Да | ✅ Да | ✅ Да |
| POST (same-site) | ✅ Да | ✅ Да | ✅ Да | ✅ Да |
| GET (cross-site iframe) | ❌ Нет | ❌ Нет | ✅ Да | ✅ Да |
| POST (cross-site iframe) | ❌ Нет | ❌ Нет | ✅ Да | ✅ Да |

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
| https://dashboard.localhost | 🔬 Панель: все три контекста одновременно + сравнение 4 куки |

## Файлы

- `example-app/` — Node.js backend (Express), выставляет 4 куки + GET/POST API
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

## SameSite=None (unpartitioned)

Кука `none_id` — это обычная cross-site кука без `Partitioned`:

```
site-a.localhost → та же кука ABC
site-b.localhost → та же кука ABC
прямой доступ    → та же кука ABC
```

В отличие от CHIPS, она **не партиционируется** — все origin видят одинаковый ID. 
Это демонстрирует, что `SameSite=None` без `Partitioned` работает как классическая cross-site кука, 
только с обязательным `Secure` флагом.

> ⚠️ В современных браузерах `SameSite=None` **требует** `Secure`. Без HTTPS кука будет проигнорирована.
