# Telegram Bot with Web App for PlaneXcra$h

Этот проект содержит Telegram бота, который открывает веб-приложение с игрой PlaneXcra$h.

## Настройка

1. Установите Python 3.8+.

2. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```

3. Хостинг веб-приложения на GitHub Pages (бесплатно, с HTTPS):
   - Создайте новый репозиторий на GitHub (public).
   - Загрузите файлы `index.html`, `game.js`, `style.css` в репозиторий.
   - В настройках репозитория: Settings > Pages > Source: Deploy from a branch > Branch: main > Save.
   - Получите URL, например, `https://yourusername.github.io/planexcash/`.

4. В `bot.py` замените `WEB_APP_URL` на ваш GitHub Pages URL.

5. Запустите бота:
   ```
   python bot.py
   ```

6. В Telegram найдите бота по токену и нажмите /start. Кнопка откроет Web App с игрой.

## Альтернатива с ngrok (если GitHub не подходит)

Если ngrok блокирует IP:
- Зарегистрируйтесь на https://ngrok.com и получите authtoken.
- Запустите: `ngrok authtoken YOUR_TOKEN`
- Затем: `ngrok http 8000`
- Используйте HTTPS URL в `bot.py`.

## Примечания

- GitHub Pages предоставляет бесплатный HTTPS.
- Web App работает в Telegram, открывая мини-приложение.