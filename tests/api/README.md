# API tests

- **Playwright `request`**: спеки в этом каталоге ходят в REST API приложения (`baseURL` из `resolveApiBaseUrl()` / `API_BASE_URL`, для stg обычно `https://api.stg.overnght.com`). Пути и контракты можно сверять со [Swagger UI staging](https://api.stg.overnght.com/api/docs/swagger#/).
- **Внешние HTTP API**: например `subscription-renewal-stripe.spec.ts` — прямые вызовы Stripe SDK (без браузера), тоже в проекте Playwright `api`.

Запуск только API: из каталога `tests/` — `npm run test:api` (или из корня репозитория `npm run test:api`).

Коллекции из Swagger (Postman / импорт OpenAPI) в этом репозитории не хранятся; при необходимости их можно сгенерировать из того же OpenAPI и использовать отдельно от Playwright.
