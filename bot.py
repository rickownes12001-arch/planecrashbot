import asyncio
from aiogram import Bot, Dispatcher
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command

# Токен бота
TOKEN = '8567898385:AAEXTjP9O__yknkQRK2SPBYLRe77XcEYD_s'

# URL веб-приложения (замените на ваш HTTPS URL, например, от GitHub Pages)
WEB_APP_URL = 'https://planecrashbot.vercel.app/'  # Замените на реальный URL

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start(message: Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="Играть в PlaneXcra$h",
                web_app=WebAppInfo(url=WEB_APP_URL)
            )]
        ]
    )
    await message.reply("Добро пожаловать! Нажмите кнопку, чтобы начать игру.", reply_markup=keyboard)

async def main():
    try:
        await dp.start_polling(bot)
    except Exception as e:
        print(f"Ошибка при запуске бота: {e}")

if __name__ == '__main__':
    asyncio.run(main())