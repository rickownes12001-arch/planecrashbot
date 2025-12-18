# Telegram Bot with Web App for PlaneXcra$h

Этот проект содержит Telegram бота, который открывает веб-приложение с игрой PlaneXcra$h.

## Быстрая настройка с Vercel (бесплатный хостинг)

1. Зарегистрируйтесь на https://vercel.com (используйте GitHub аккаунт).

2. Импортируйте репозиторий: Dashboard > Import Project > From Git Repository > Вставьте URL вашего GitHub repo.

3. Выберите проект, нажмите Deploy.

4. Получите URL, например, `https://planexcash.vercel.app`.

5. В `bot.py` замените `WEB_APP_URL` на этот URL.

6. Установите Python и зависимости: `pip install -r requirements.txt`

7. Запустите бота: `python bot.py`

8. В Telegram найдите бота и нажмите /start.

## Альтернатива с ngrok

Если Vercel не подходит:
- Зарегистрируйтесь на ngrok, получите token.
- `ngrok authtoken YOUR_TOKEN`
- Запустите сервер: `python -m http.server 8000`
- `ngrok http 8000`
- Используйте HTTPS URL в `bot.py`.

Бот запустится локально, Web App откроется в Telegram.