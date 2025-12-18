import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Токен бота
TOKEN = '8567898385:AAEXTjP9O__yknkQRK2SPBYLRe77XcEYD_s'

# URL веб-приложения (замените на ваш HTTPS URL, например, от GitHub Pages)
WEB_APP_URL = 'https://yourusername.github.io/planexcash/'  # Замените на реальный URL

bot = Bot(token=TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    keyboard = InlineKeyboardMarkup()
    keyboard.add(InlineKeyboardButton(
        text="Играть в PlaneXcra$h",
        web_app=WebAppInfo(url=WEB_APP_URL)
    ))
    await message.reply("Добро пожаловать! Нажмите кнопку, чтобы начать игру.", reply_markup=keyboard)

if __name__ == '__main__':
    from aiogram import executor
    executor.start_polling(dp, skip_updates=True)