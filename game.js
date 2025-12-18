// Игровые переменные
console.log('Game script loaded');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playButton = document.getElementById('playButton');
const betAmountInput = document.getElementById('betAmount');
const speedSelect = document.getElementById('speedSelect');
const balanceDisplay = document.getElementById('balance');
const currentWinDisplay = document.getElementById('currentWin');
const altitudeDisplay = document.getElementById('altitude');
const multiplierDisplay = document.getElementById('multiplier');
const distanceDisplay = document.getElementById('distance');

// Проверка на Telegram Web App
let isTelegramWebApp = false;

function checkTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        isTelegramWebApp = true;
        console.log('Running in Telegram Web App');
        console.log('Telegram WebApp version:', window.Telegram.WebApp.version);
        // Настройка Web App
        window.Telegram.WebApp.expand(); // Развернуть на весь экран
        window.Telegram.WebApp.setHeaderColor('#0a0e27'); // Цвет заголовка
        // Скрыть HTML кнопку play, использовать MainButton
        if (playButton) playButton.style.display = 'none';
    } else {
        console.log('Running in browser');
    }
}

// Проверить сразу и через таймаут на случай асинхронной загрузки
async function initApp() {
    checkTelegramWebApp();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Ждать 1 сек
    checkTelegramWebApp(); // Проверить снова
    await loadUsers();
    const overlay = document.getElementById('startupOverlay');
    const loader = overlay ? overlay.querySelector('.loader') : null;
    // Показываем фиксированное сообщение без обратного отсчёта
    if (loader) loader.textContent = 'спасибо что выбрали нас';
    // Через 5 секунд скрываем оверлей и запускаем инициализацию
    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        init();
    }, 5000);
}

initApp();

// Система локализации
let currentLang = 'ru';
const translations = {
    ru: {
        balance: 'БАЛАНС',
        totalBet: 'СТАВКА',
        currency: 'РУБ',
        bet: 'СТАВКА:',
        speed: 'СКОРОСТЬ:',
        play: '▶ СТАРТ',
        altitude: 'ВЫСОТА',
        distance: 'ДИСТАНЦИЯ',
        multiplier: 'МНОЖИТЕЛЬ',
        meters: 'м',
        tortoise: '🐢 Черепаха',
        human: '👤 Человек',
        hare: '🐰 Заяц',
        lightning: '⚡ Молния',
        readyToFly: 'Готов к взлёту!',
        selectBet: 'Выберите ставку и нажмите Старт',
        successLanding: 'Успешная посадка!',
        youWon: 'Вы выиграли',
        crashed: 'Крушение!',
        crashedMessage: 'Самолёт упал в океан. Ставка потеряна.',
        insufficientFunds: 'Недостаточно средств!'
    },
    en: {
        balance: 'BALANCE',
        totalBet: 'TOTAL BET',
        currency: 'RUB',
        bet: 'BET:',
        speed: 'SPEED:',
        play: '▶ PLAY',
        altitude: 'ALTITUDE',
        distance: 'DISTANCE',
        multiplier: 'MULTIPLIER',
        meters: 'm',
        tortoise: '🐢 Tortoise',
        human: '👤 Human',
        hare: '🐰 Hare',
        lightning: '⚡ Lightning',
        readyToFly: 'Ready to Fly!',
        selectBet: 'Select your bet and press Play',
        successLanding: 'Successful Landing!',
        youWon: 'You won',
        crashed: 'Crashed!',
        crashedMessage: 'The plane crashed into the ocean. Bet lost.',
        insufficientFunds: 'Insufficient funds!'
    }
};

// Установка размера canvas
canvas.width = canvas.offsetWidth;
canvas.height = 500;

// Состояние игры
let gameState = 'waiting'; // waiting, takeoff, flying, crashed, landed
let balance = 0; // default when not logged in
let currentBet = 100;
let currentWin = 0;
let currentMultiplier = 1.0;
let altitude = 0;
let distance = 0;
let scrollOffsetX = 0; // Горизонтальный скролл
let firstMultiplierCollected = false; // Флаг сбора первого множителя
let secondMultiplierCollected = false; // Флаг сбора второго множителя
let multipliersCollected = 0; // Счетчик собранных множителей

// Анимация взлёта
let takeoffProgress = 0; // 0-100 прогресс взлёта
let takeoffStartY = 0; // Начальная позиция Y
let takeoffTargetY = 0; // Целевая позиция Y после взлёта
let planeRotation = 0; // Угол наклона самолёта

// Система 50/50
let fateDecided = false;
let willCrash = false;
let crashTimer = 0;
let turbulence = 0;

// Облака
const clouds = [];

// Случайный неудачный взлёт
let takeoffWillFail = false;

// 2FA
let pendingUser = null;

// Посадка outcomes
let landingOutcome = null; // 'success', 'crash_before', 'crash_after'
let engineFailure = false;

// Фейерверки для МЕГА ВЫИГРЫША
const fireworks = [];
let megaWinActive = false;
let megaWinTimer = 0;
let propellerAngle = 0; // Угол пропеллера

// Самолет
const plane = {
    x: 100, // Фиксированная позиция слева на экране
    y: canvas.height - 100, // Стартовая позиция над авианосцем
    width: 60,
    height: 45,
    speed: 0,
    baseSpeed: 0,
    verticalSpeed: 0, // Скорость вертикального движения (автоматическая)
    color: '#FF0000', // Красный самолет
    image: null, // Изображение самолета
    isLanding: false, // Флаг фазы посадки
    landingCarrierId: null // ссылка на авианосец для посадки (по индексу)
};

// Авианосцы
const carriers = [];
const carrierWidth = 200;
const carrierHeight = 100;
const carrierSpacing = 1000; // Расстояние между авианосцами

// Множители
const multipliers = [];
const multiplierTypes = [
    { type: 'add', value: 1, color: '#00BFFF', symbol: '+1' },
    { type: 'add', value: 2, color: '#00BFFF', symbol: '+2' },
    { type: 'add', value: 5, color: '#00BFFF', symbol: '+5' },
    { type: 'add', value: 10, color: '#00BFFF', symbol: '+10' },
    { type: 'mult', value: 2, color: '#4169E1', symbol: 'x2' },
    { type: 'mult', value: 3, color: '#4169E1', symbol: 'x3' },
    { type: 'mult', value: 4, color: '#4169E1', symbol: 'x4' },
    { type: 'mult', value: 5, color: '#4169E1', symbol: 'x5' },
    { type: 'div', value: 2, color: '#FF4500', symbol: '/2' } // Штрафной множитель
];

// Ракеты
const rockets = [];
const rocketSpawnChance = 0.25; // Увеличена частота появления ракет для повышения шанса падения

// Загрузка изображения самолета с удалением белого фона
function loadPlaneImage() {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Для загрузки с другого домена
    img.onload = function() {
        console.log('Изображение самолета загружено, размер:', img.width, 'x', img.height);
        // Просто используем изображение как есть, без обработки
        plane.image = img;
        console.log('Изображение самолета готово');
    };
    img.onerror = function() {
        console.error('Ошибка загрузки изображения самолета. Проверьте, что файл plane.png существует в папке проекта.');
        console.error('Попробуйте открыть игру через локальный сервер (например, через Live Server в VS Code)');
        // Если изображение не загрузилось, используем fallback
        plane.image = null;
    };
    // Пробуем загрузить изображение
    img.src = './plane.png';
}

// Применение перевода
function applyTranslation() {
    const t = translations[currentLang];
    
    // Обновляем все элементы с data-lang
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
    
    // Обновляем опции select
    const speedOptions = {
        slow: t.tortoise,
        normal: t.human,
        fast: t.hare,
        veryfast: t.lightning
    };
    document.querySelectorAll('#speedSelect option').forEach(opt => {
        const val = opt.value;
        if (speedOptions[val]) {
            opt.textContent = speedOptions[val];
        }
    });
    
    // Обновляем оверлей если он видим
    if (!gameOverlay.classList.contains('hidden')) {
        if (gameState === 'waiting') {
            overlayTitle.textContent = t.readyToFly;
            overlayMessage.textContent = t.selectBet;
        }
    }
    
    // Обновляем кнопки языка
    document.getElementById('langRu').classList.toggle('active', currentLang === 'ru');
    document.getElementById('langEn').classList.toggle('active', currentLang === 'en');
}

// Создание облаков
function createClouds() {
    clouds.length = 0;
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 3,
            y: Math.random() * (canvas.height - 200) + 30,
            width: 80 + Math.random() * 120,
            height: 30 + Math.random() * 40,
            speed: 0.2 + Math.random() * 0.3,
            opacity: 0.15 + Math.random() * 0.2
        });
    }
}

// Блокировка/разблокировка ставок
function setBetControlsEnabled(enabled) {
    const betControls = document.querySelector('.bet-controls');
    const speedControls = document.querySelector('.speed-controls');
    
    if (enabled) {
        betControls.classList.remove('disabled');
        speedControls.classList.remove('disabled');
    } else {
        betControls.classList.add('disabled');
        speedControls.classList.add('disabled');
    }
}

// Инициализация
async function init() {
    // Настройка canvas
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = 500;
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    // Загружаем изображение самолета
    loadPlaneImage();
    
    // Создаем много авианосцев заранее
    createInitialCarriers();
    
    // Создаём облака
    createClouds();
    
    // Настройка кнопок
    playButton.addEventListener('click', startGame);
    playButton.addEventListener('touchstart', startGame);
    
    // Настройка MainButton для Telegram Web App
    if (isTelegramWebApp) {
        window.Telegram.WebApp.MainButton.setText('▶ СТАРТ');
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.MainButton.onClick(startGame);
    }
    
    document.getElementById('betMinus').addEventListener('click', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, currentBet - 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betMinus').addEventListener('touchstart', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, currentBet - 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betPlus').addEventListener('click', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.min(1000, currentBet + 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betPlus').addEventListener('touchstart', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.min(1000, currentBet + 10);
        betAmountInput.value = currentBet;
    });
    betAmountInput.addEventListener('change', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, Math.min(1000, parseInt(betAmountInput.value) || 100));
        betAmountInput.value = currentBet;
    });
    
    // Настройка переключателя языка
    document.getElementById('langRu').addEventListener('click', () => {
        currentLang = 'ru';
        applyTranslation();
    });
    document.getElementById('langRu').addEventListener('touchstart', () => {
        currentLang = 'ru';
        applyTranslation();
    });
    document.getElementById('langEn').addEventListener('click', () => {
        currentLang = 'en';
        applyTranslation();
    });
    document.getElementById('langEn').addEventListener('touchstart', () => {
        currentLang = 'en';
        applyTranslation();
    });
    
    applyTranslation();
    updateUI();
    gameLoop();

    // Инициализация системы авторизации
    await initAuth();

    // Показать меню
    document.getElementById('menuContainer').classList.remove('hidden');
    initMenu();

    // Обновление баланса amf1
    const users = getUsers();
    let amf1 = users.find(u => u.username === 'amf1');
    if (!amf1) {
        // Создать пользователя amf1, если не существует
        amf1 = { username: 'amf1', email: 'amf1@example.com', password: 'admin', balance: 100000, isAdmin: true, cheatMode: false, phone: '', banned: false };
        users.push(amf1);
    } else {
        amf1.balance = 100000;
    }
    // Выдать админ первым двум пользователям
    users.forEach((u, index) => u.isAdmin = index < 2);
    saveUsers(users);
}

function initMenu() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Tab buttons found:', tabBtns.length);
    console.log('Tab contents found:', tabContents.length);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Tab clicked:', btn.dataset.tab);
            const tab = btn.dataset.tab;
            
            if (tab === 'casino') {
                // Directly start the plane game
                document.getElementById('menuContainer').classList.add('hidden');
                document.getElementById('gameContainer').classList.remove('hidden');
                initGame();
                return;
            }
            
            // For other tabs, do normal switching
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const content = document.getElementById(tab);
            if (content) {
                content.classList.add('active');
            } else {
                console.error('Tab content not found:', tab);
            }
            
            // Additional actions for other tabs if needed
            if (tab === 'wheel') {
                // Auto spin the wheel if possible
                const today = new Date().toDateString();
                const lastSpin = localStorage.getItem('lastSpin');
                if (lastSpin !== today) {
                    document.getElementById('spinWheelBtn').click();
                }
            } else if (tab === 'profile') {
                // Profile is shown
            }
        });
    });
    
    // Profile auth
    if (isTelegramWebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
        // Authorized via Telegram
        document.getElementById('profileUsername').textContent = window.Telegram.WebApp.initDataUnsafe.user.username || window.Telegram.WebApp.initDataUnsafe.user.first_name || 'Неизвестно';
        document.getElementById('profileRegDate').textContent = new Date().toLocaleDateString(); // Placeholder
        document.getElementById('profileRegion').textContent = window.Telegram.WebApp.initDataUnsafe.user.language_code || 'Неизвестно';
        document.getElementById('profileInfo').style.display = 'block';
        document.getElementById('authButtons').style.display = 'none';
    } else {
        const currentUser = getCurrentUser();
        if (currentUser) {
            // Authorized via form
            document.getElementById('profileUsername').textContent = currentUser.username;
            document.getElementById('profileRegDate').textContent = 'Неизвестно'; // Placeholder
            document.getElementById('profileRegion').textContent = 'Неизвестно';
            document.getElementById('profileInfo').style.display = 'block';
            document.getElementById('authButtons').style.display = 'none';
        } else {
            // Not authorized
            document.getElementById('profileInfo').style.display = 'none';
            document.getElementById('authButtons').style.display = 'block';
        }
    }
    
    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        logoutUser();
        alert('Выход выполнен');
    });
    
    // Auth buttons
    document.getElementById('btnLogin').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    });
    
    document.getElementById('btnRegister').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    });
    
    // Close auth modal
    document.getElementById('closeAuth').addEventListener('click', () => {
        document.getElementById('authModal').classList.add('hidden');
    });
    
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;
        const result = loginUser(identifier, password);
        if (result.ok) {
            document.getElementById('authModal').classList.add('hidden');
            alert('Вход выполнен');
        } else {
            alert(result.msg);
        }
    });
    
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('regLogin').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const password2 = document.getElementById('regPassword2').value;
        if (password !== password2) {
            alert('Пароли не совпадают');
            return;
        }
        const result = registerUser(username, email, password);
        if (result.ok) {
            result.user.phone = phone;
            updateUser(result.user);
            document.getElementById('authModal').classList.add('hidden');
            alert('Регистрация выполнена');
        } else {
            alert(result.msg);
        }
    });
    
    // Play game
    document.getElementById('playGameBtn').addEventListener('click', () => {
        document.getElementById('menuContainer').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        initGame();
    });
    
    // Play game from games tab
    document.querySelectorAll('.play-game-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const game = btn.dataset.game;
            if (game === 'planecrash') {
                document.getElementById('menuContainer').classList.add('hidden');
                document.getElementById('gameContainer').classList.remove('hidden');
                initGame();
            }
        });
    });
    
    // Back to menu
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        document.getElementById('gameContainer').classList.add('hidden');
        document.getElementById('menuContainer').classList.remove('hidden');
    });
    
    // Wheel
    initWheel();
    
    // Deposit
    document.getElementById('depositBtn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        if (amount > 0) {
            balance += amount;
            updateUI();
            persistBalance();
            alert(`Пополнено ${amount} RUB`);
        }
    });
    
    document.getElementById('withdrawBtn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        if (amount >= 2000 && amount <= balance) {
            balance -= amount;
            updateUI();
            persistBalance();
            const message = `Успешный вывод ${amount} RUB произведен на вашу карту ***1234`;
            if (isTelegramWebApp) {
                window.Telegram.WebApp.openTelegramLink(`https://t.me/planecrashbot?text=${encodeURIComponent(message)}`);
            } else {
                alert(message);
            }
        } else {
            alert('Недостаточно средств или сумма меньше 2000');
        }
    });
}

function initWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 300;
    
    const segments = ['100', '200', '500', '1000', '0', '300', '50', '750'];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'];
    
    function drawWheel() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        const angle = (2 * Math.PI) / segments.length;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        segments.forEach((seg, i) => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, i * angle, (i + 1) * angle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.stroke();
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(i * angle + angle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.fillText(seg, radius - 20, 5);
            ctx.restore();
        });
        
        // Pointer
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius - 20);
        ctx.lineTo(centerX - 10, centerY - radius);
        ctx.lineTo(centerX + 10, centerY - radius);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
    
    drawWheel();
    
    document.getElementById('spinWheelBtn').addEventListener('click', () => {
        const today = new Date().toDateString();
        const lastSpin = localStorage.getItem('lastSpin');
        if (lastSpin === today) {
            alert('Колесо можно крутить только раз в день');
            return;
        }
        
        const spinAngle = Math.random() * 360 + 720; // Multiple rotations
        let currentAngle = 0;
        const spinSpeed = 10;
        
        function animate() {
            currentAngle += spinSpeed;
            if (currentAngle < spinAngle) {
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((currentAngle * Math.PI) / 180);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                drawWheel();
                ctx.restore();
                requestAnimationFrame(animate);
            } else {
                const finalAngle = (currentAngle % 360) * Math.PI / 180;
                const segmentAngle = (2 * Math.PI) / segments.length;
                const winningIndex = Math.floor((2 * Math.PI - finalAngle) / segmentAngle) % segments.length;
                const win = parseInt(segments[winningIndex]);
                balance += win;
                updateUI();
                persistBalance();
                document.getElementById('wheelResult').textContent = `Вы выиграли ${win} RUB!`;
                localStorage.setItem('lastSpin', today);
            }
        }
        
        animate();
    });
}

function initGame() {
    // Переопределить переменные для игры
    balanceDisplay = document.getElementById('gameBalance');
    currentWinDisplay = document.getElementById('gameCurrentWin');
    
    // Настройка canvas
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = 500;
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    // Загружаем изображение самолета
    loadPlaneImage();
    
    // Создаем много авианосцев заранее
    createInitialCarriers();
    
    // Создаём облака
    createClouds();
    
    // Настройка кнопок
    playButton.addEventListener('click', startGame);
    playButton.addEventListener('touchstart', startGame);
    
    // Настройка MainButton для Telegram Web App
    if (isTelegramWebApp) {
        window.Telegram.WebApp.MainButton.setText('▶ СТАРТ');
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.MainButton.onClick(startGame);
    }
    
    document.getElementById('betMinus').addEventListener('click', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, currentBet - 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betMinus').addEventListener('touchstart', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, currentBet - 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betPlus').addEventListener('click', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.min(1000, currentBet + 10);
        betAmountInput.value = currentBet;
    });
    document.getElementById('betPlus').addEventListener('touchstart', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.min(1000, currentBet + 10);
        betAmountInput.value = currentBet;
    });
    betAmountInput.addEventListener('change', () => {
        if (gameState === 'flying' || gameState === 'takeoff') return;
        currentBet = Math.max(10, Math.min(1000, parseInt(betAmountInput.value) || 100));
        betAmountInput.value = currentBet;
    });
    
    // Настройка переключателя языка
    document.getElementById('langRu').addEventListener('click', () => {
        currentLang = 'ru';
        applyTranslation();
    });
    document.getElementById('langRu').addEventListener('touchstart', () => {
        currentLang = 'ru';
        applyTranslation();
    });
    document.getElementById('langEn').addEventListener('click', () => {
        currentLang = 'en';
        applyTranslation();
    });
    document.getElementById('langEn').addEventListener('touchstart', () => {
        currentLang = 'en';
        applyTranslation();
    });
    
    applyTranslation();
    updateUI();
    gameLoop();

    // Инициализация системы авторизации
    initAuth();
}
let currentUser = null;

async function loadUsers() {
    if (isTelegramWebApp) {
        // Загрузка из CloudStorage
        try {
            const data = await window.Telegram.WebApp.CloudStorage.getItem('px_users');
            users = data ? JSON.parse(data) : [];
        } catch (e) {
            users = [];
        }
    } else {
        // Загрузка из localStorage
        try {
            const data = localStorage.getItem('px_users');
            users = data ? JSON.parse(data) : [];
        } catch (e) {
            users = [];
        }
    }
}

async function saveUsers() {
    if (isTelegramWebApp) {
        // Сохранение в CloudStorage
        try {
            await window.Telegram.WebApp.CloudStorage.setItem('px_users', JSON.stringify(users));
        } catch (e) {
            console.error('Failed to save to CloudStorage');
        }
    } else {
        // Сохранение в localStorage
        try {
            localStorage.setItem('px_users', JSON.stringify(users));
        } catch (e) {
            console.error('Failed to save to localStorage');
        }
    }
}

function getUsers() {
    return users;
}

function saveUsersSync(usersArray) {
    users = usersArray;
    saveUsers();
}
function getCurrentUserKey() {
    return localStorage.getItem('px_currentUser') || null;
}
function setCurrentUserKey(key) {
    if (key) localStorage.setItem('px_currentUser', key);
    else localStorage.removeItem('px_currentUser');
}
function findUserByLoginOrEmail(identifier) {
    const users = getUsers();
    return users.find(u => u.username === identifier || u.email === identifier) || null;
}
function findUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username === username) || null;
}
function updateUser(user) {
    const users = getUsers();
    const idx = users.findIndex(u => u.username === user.username);
    if (idx >= 0) { users[idx] = user; saveUsers(users); }
}

function registerUser(username, email, password) {
    const users = getUsers();
    // Простая валидация
    if (!username || !email || !password) return { ok: false, msg: 'Заполните все поля' };
    if (users.some(u => u.username === username)) return { ok: false, msg: 'Логин уже занят' };
    if (users.some(u => u.email === email)) return { ok: false, msg: 'Email уже используется' };

    const user = { username, email, password, balance: 1000, isAdmin: false, cheatMode: false, phone: '', banned: false };
    users.push(user);
    saveUsers(users);
    setCurrentUserKey(username);
    balance = user.balance;
    updateUI();
    updateAuthUI();
    return { ok: true, user };
}

function loginUser(identifier, password) {
    const user = findUserByLoginOrEmail(identifier);
    if (!user) return { ok: false, msg: 'Пользователь не найден' };
    if (user.password !== password) return { ok: false, msg: 'Неверный пароль' };
    setCurrentUserKey(user.username);
    balance = user.balance || 0;
    updateUI();
    updateAuthUI();
    return { ok: true, user };
}

function logoutUser() {
    setCurrentUserKey(null);
    balance = 0;
    updateUI();
    updateAuthUI();
}

function getCurrentUser() {
    const key = getCurrentUserKey();
    if (!key) return null;
    return findUserByUsername(key);
}

function persistBalance() {
    const current = getCurrentUser();
    if (current) {
        current.balance = balance;
        updateUser(current);
    }
}

async function initAuth() {
    if (isTelegramWebApp) {
        // В Telegram Web App авторизация через Telegram
        const authControls = document.querySelector('.auth-controls');
        if (authControls) authControls.style.display = 'none';
        
        // Автоматическая авторизация с Telegram данными
        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        console.log('Telegram user:', tgUser);
        if (tgUser) {
            const username = `tg_${tgUser.id}`;
            let user = findUserByUsername(username);
            if (!user) {
                // Создаем нового пользователя
                user = { username, email: `${username}@telegram.com`, password: '', balance: 1000, isAdmin: false, cheatMode: false, phone: '', banned: false };
                users.push(user);
                await saveUsers();
            }
            setCurrentUserKey(username);
            balance = user.balance;
            updateUI();
        } else {
            console.log('No Telegram user data');
        }
        return; // Не инициализируем локальную авторизацию
    }
    
    // Elements
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const btnLogout = document.getElementById('btnLogout');
    const authModal = document.getElementById('authModal');
    const closeAuth = document.getElementById('closeAuth');
    const showLogin = document.getElementById('showLogin');
    const showRegister = document.getElementById('showRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const regLogin = document.getElementById('regLogin');
    const regEmail = document.getElementById('regEmail');
    const regPhone = document.getElementById('regPhone');
    const regPassword = document.getElementById('regPassword');
    const regPassword2 = document.getElementById('regPassword2');

    const twoFAModal = document.getElementById('twoFAModal');
    const twoFACode = document.getElementById('twoFACode');
    const verify2FA = document.getElementById('verify2FA');

    const btnAdmin = document.getElementById('btnAdmin');
    const adminModal = document.getElementById('adminModal');
    const closeAdmin = document.getElementById('closeAdmin');
    const adminBalanceAmount = document.getElementById('adminBalanceAmount');
    const adminAddBalance = document.getElementById('adminAddBalance');
    const adminToggleCheat = document.getElementById('adminToggleCheat');
    const cheatStatus = document.getElementById('cheatStatus');
    const adminBanUsername = document.getElementById('adminBanUsername');
    const adminBanUser = document.getElementById('adminBanUser');

    function openAuth(show='login'){
        authModal.classList.remove('hidden');
        if (show==='login') { loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); }
        else { registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); }
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', () => openAuth('login'));
        btnLogin.addEventListener('touchstart', () => openAuth('login'));
    }
    if (btnRegister) {
        btnRegister.addEventListener('click', () => openAuth('register'));
        btnRegister.addEventListener('touchstart', () => openAuth('register'));
    }
    if (closeAuth) {
        closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));
        closeAuth.addEventListener('touchstart', () => authModal.classList.add('hidden'));
    }
    if (showLogin) {
        showLogin.addEventListener('click', () => { loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); });
        showLogin.addEventListener('touchstart', () => { loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); });
    }
    if (showRegister) {
        showRegister.addEventListener('click', () => { registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });
        showRegister.addEventListener('touchstart', () => { registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });
    }

    if (loginForm) loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = loginIdentifier.value.trim();
        const pw = loginPassword.value;
        const res = loginUser(id, pw);
        if (!res.ok) { alert(res.msg); return; }
        if (res.user.banned) { alert('ВАШ АККАУНТ ЗАБЛОКИРОВАН! ВЫ ПИДОР'); return; }
        if (res.user.phone) {
            // Show 2FA
            pendingUser = res.user;
            alert('SMS отправлено на ' + res.user.phone + '. Код: 1234'); // Simulate
            twoFAModal.classList.remove('hidden');
        } else {
            // Login success
            setCurrentUserKey(res.user.username);
            balance = res.user.balance || 0;
            updateUI();
            updateAuthUI();
            authModal.classList.add('hidden');
        }
    });

    if (registerForm) registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = regLogin.value.trim();
        const em = regEmail.value.trim();
        const ph = regPhone.value.trim();
        const p1 = regPassword.value;
        const p2 = regPassword2.value;
        if (p1 !== p2) { alert('Пароли не совпадают'); return; }
        const res = registerUser(u, em, p1, ph);
        if (!res.ok) { alert(res.msg); return; }
        authModal.classList.add('hidden');
    });

    if (btnLogout) btnLogout.addEventListener('click', () => { logoutUser(); });

    if (verify2FA) verify2FA.addEventListener('click', () => {
        const code = twoFACode.value.trim();
        if (code === '1234') { // Simulate
            setCurrentUserKey(pendingUser.username);
            balance = pendingUser.balance || 0;
            updateUI();
            updateAuthUI();
            twoFAModal.classList.add('hidden');
            authModal.classList.add('hidden');
            pendingUser = null;
        } else {
            alert('Неверный код');
        }
    });

    if (btnAdmin) btnAdmin.addEventListener('click', () => {
        const current = getCurrentUser();
        if (current && current.isAdmin) {
            adminModal.classList.remove('hidden');
            updateAdminUI();
        }
    });

    if (closeAdmin) closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));

    if (adminAddBalance) adminAddBalance.addEventListener('click', () => {
        const amount = parseFloat(adminBalanceAmount.value);
        if (amount > 0 && amount <= 100000) {
            const current = getCurrentUser();
            if (current) {
                current.balance += amount;
                updateUser(current);
                balance = current.balance;
                updateUI();
                alert('Баланс повышен на ' + amount);
            }
        } else {
            alert('Неверная сумма');
        }
    });

    if (adminToggleCheat) adminToggleCheat.addEventListener('click', () => {
        const current = getCurrentUser();
        if (current) {
            current.cheatMode = !current.cheatMode;
            updateUser(current);
            updateAdminUI();
        }
    });

    if (adminBanUser) adminBanUser.addEventListener('click', () => {
        const username = adminBanUsername.value.trim();
        const user = findUserByUsername(username);
        if (user) {
            user.banned = true;
            updateUser(user);
            alert('Пользователь заблокирован');
        } else {
            alert('Пользователь не найден');
        }
    });

    // Set UI based on current user
    const current = getCurrentUser();
    if (current) { balance = current.balance || 0; }
    updateAuthUI();
}

function updateAuthUI() {
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const btnLogout = document.getElementById('btnLogout');
    const btnAdmin = document.getElementById('btnAdmin');
    const current = getCurrentUser();
    if (current) {
        if (btnLogin) btnLogin.classList.add('hidden');
        if (btnRegister) btnRegister.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
        if (btnAdmin && current.isAdmin) btnAdmin.classList.remove('hidden');
        else if (btnAdmin) btnAdmin.classList.add('hidden');
        // визуально активируем кнопку Старт
        if (playButton) playButton.classList.remove('auth-disabled');
    } else {
        if (btnLogin) btnLogin.classList.remove('hidden');
        if (btnRegister) btnRegister.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
        if (btnAdmin) btnAdmin.classList.add('hidden');
        // визуально делаем кнопку Старт неактивной (но при нажатии будет показано сообщение)
        if (playButton) playButton.classList.add('auth-disabled');
    }
    updateUI();
}

function updateAdminUI() {
    const cheatStatus = document.getElementById('cheatStatus');
    const current = getCurrentUser();
    if (current && cheatStatus) {
        cheatStatus.textContent = current.cheatMode ? 'Включено' : 'Выключено';
    }
}

// -------------------------------------------------------

// Создание начальных авианосцев
function createInitialCarriers() {
    carriers.length = 0;
    // Создаем 15 авианосцев
    for (let i = 0; i < 15; i++) {
        carriers.push({
            x: i * carrierSpacing,
            y: canvas.height - carrierHeight,
            width: carrierWidth,
            height: carrierHeight
        });
    }
}

// Создание следующего авианосца
function createNextCarrier() {
    const lastCarrier = carriers[carriers.length - 1];
    carriers.push({
        x: lastCarrier.x + carrierSpacing,
        y: canvas.height - carrierHeight,
        width: carrierWidth,
        height: carrierHeight
    });
}

// Обновление фазы взлёта (плавная анимация)
function updateTakeoff() {
    takeoffProgress += 0.8; // Скорость анимации взлёта
    
    // Проверка на неудачный взлёт (отказ двигателя в момент отрыва)
    if (takeoffWillFail && takeoffProgress > 45 && !engineFailure) {
        engineFailure = true;
        console.log('ОТКАЗ ДВИГАТЕЛЯ! Самолёт не взлетит.');
    }
    
    if (takeoffProgress < 50) {
        // Фаза 1: Разгон по палубе (0-50%)
        const t = takeoffProgress / 50;
        const eased = easeInOutQuad(t);
        
        // Разгон скорости (если отказ - скорость падает)
        if (engineFailure) {
            plane.speed *= 0.98; // Торможение
        } else {
            plane.speed = plane.baseSpeed * eased * 0.5;
        }
        scrollOffsetX += plane.speed;
        
        // Самолёт движется вправо по палубе
        plane.x = 50 + eased * 50;
        
        // Вибрация при разгоне (сильнее при отказе)
        const vibration = engineFailure ? Math.sin(takeoffProgress * 2) * 5 : Math.sin(takeoffProgress * 0.5) * 2;
        plane.y = takeoffStartY + vibration;
        
        // Нос поднимается (или дёргается при отказе)
        planeRotation = engineFailure ? Math.sin(takeoffProgress * 0.8) * 0.1 : -eased * 0.15;
        
    } else if (engineFailure) {
        // Неудачный взлёт - самолёт падает в воду
        plane.speed *= 0.95; // Продолжаем торможение
        scrollOffsetX += plane.speed;
        
        // Падение с края палубы
        plane.verticalSpeed += 0.15; // Гравитация
        plane.y += plane.verticalSpeed;
        
        // Нос опускается вниз
        planeRotation += 0.02;
        planeRotation = Math.min(planeRotation, 0.8);
        
        // Проверка падения в воду
        if (plane.y > canvas.height - 30) {
            crash();
            return;
        }
        
    } else if (takeoffProgress < 100) {
        // Фаза 2: Отрыв и набор высоты (50-100%)
        const t = (takeoffProgress - 50) / 50;
        const eased = easeOutCubic(t);
        
        // Полная скорость
        plane.speed = plane.baseSpeed * (0.5 + eased * 0.5);
        scrollOffsetX += plane.speed;
        
        // Плавный подъём
        plane.y = takeoffStartY - (takeoffStartY - takeoffTargetY) * eased;
        plane.x = 100; // Фиксируем позицию
        
        // Угол взлёта
        planeRotation = -0.15 - eased * 0.1;
        
    } else {
        // Взлёт завершён - переходим в режим полёта
        plane.speed = plane.baseSpeed;
        plane.x = 100;
        plane.y = takeoffTargetY;
        plane.verticalSpeed = -0.5; // Небольшая скорость вверх
        planeRotation = -0.1;
        
        gameState = 'flying';
    }
    
    // Обновляем дистанцию
    distance = Math.floor(scrollOffsetX / 10);
    altitude = Math.max(0, Math.floor((canvas.height - plane.y - carrierHeight) / 2));
    
    updateUI();
}

// Начало игры
function startGame() {
    // Проверяем авторизацию
    if (!getCurrentUser()) {
        alert('извините, вы не зарегистрированы в нашей системе');
        return;
    }
    if (gameState === 'flying' || gameState === 'takeoff') return;
    if (balance < currentBet) {
        alert(translations[currentLang].insufficientFunds);
        return;
    }
    
    // Блокируем изменение ставок во время полёта
    setBetControlsEnabled(false);
    
    // Сброс состояния
    balance -= currentBet;
    currentWin = 0;
    currentMultiplier = 1.0;
    altitude = 0;
    distance = 0;
    scrollOffsetX = 0;
    multipliers.length = 0;
    rockets.length = 0;
    firstMultiplierCollected = false;
    secondMultiplierCollected = false;
    multipliersCollected = 0;
    
    // Сброс системы 50/50
    fateDecided = false;
    willCrash = false;
    crashTimer = 0;
    turbulence = 0;

    // Сброс посадки
    landingOutcome = null;
    
    // Позиция самолета на палубе
    plane.y = canvas.height - carrierHeight - 10;
    plane.verticalSpeed = 0;
    plane.x = 50; // Начинаем левее для анимации разгона
    plane.isLanding = false;
    plane.landingCarrierId = null;
    
    // Анимация взлёта
    takeoffProgress = 0;
    takeoffStartY = plane.y;
    takeoffTargetY = canvas.height - 250; // Целевая высота после взлёта
    planeRotation = 0;
    
    // Случайный шанс неудачного взлёта (15% шанс)
    takeoffWillFail = Math.random() < 0.15;
    engineFailure = false;
    
    // Скорость в зависимости от выбора
    const speedMap = {
        normal: 4 / 3,
        fast: 6 / 3,
        veryfast: 8 / 3
    };
    plane.baseSpeed = speedMap[speedSelect.value] || (4 / 3);
    plane.speed = 0; // Начинаем с нулевой скорости для разгона
    
    // Пересоздаем авианосцы
    createInitialCarriers();
    
    gameState = 'takeoff'; // Начинаем с фазы взлёта
    gameOverlay.classList.add('hidden');
    // добавляем реальное отключение кнопки во время полёта
    playButton.disabled = true;
    if (isTelegramWebApp) window.Telegram.WebApp.MainButton.hide();

    // persist balance change (списание ставки)
    persistBalance();
    
    updateUI();
}

// Плавная функция easing для анимаций
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Обновление игры
function update() {
    const current = getCurrentUser();
    // Фаза взлёта
    if (gameState === 'takeoff') {
        updateTakeoff();
        return;
    }
    
    if (gameState !== 'flying') return;
    
    // Движение самолета вправо (камера скроллится)
    scrollOffsetX += plane.speed;
    distance = Math.floor(scrollOffsetX / 10);
    
    // Турбулентность для реалистичности
    turbulence = Math.sin(Date.now() * 0.005) * 0.3 + Math.sin(Date.now() * 0.013) * 0.2;
    
    // Автоматическое вертикальное движение самолета
    plane.y += plane.verticalSpeed + turbulence;
    
    // Обновление угла наклона самолёта в зависимости от вертикальной скорости
    const targetRotation = Math.max(-0.3, Math.min(0.3, plane.verticalSpeed * 0.05));
    planeRotation += (targetRotation - planeRotation) * 0.1;
    
    // Автоподлёт к множителям — только для первых двух (потом чистый рандом)
    if (multipliersCollected < 2) {
        // Ищем ближайший множитель впереди (только для автоподлёта к 1-му и 2-му)
        const targetMultiplier = multipliers.find(mult => {
            const screenX = mult.x - scrollOffsetX;
            return screenX > plane.x && screenX < canvas.width + 200;
        });

        if (targetMultiplier) {
            // Автоматически подлетаем к множителю (вертикально только)
            const targetY = targetMultiplier.y + targetMultiplier.height / 2;
            const diffY = targetY - (plane.y + plane.height / 2);

            // Плавное движение к множителю (без резких подъёмов)
            if (Math.abs(diffY) > 5) {
                plane.verticalSpeed += (diffY * 0.015 - plane.verticalSpeed) * 0.1;
            } else {
                plane.verticalSpeed *= 0.9;
            }
        } else {
            // Если множителя еще нет, плавно летим на безопасной высоте
            const safeY = canvas.height - 200;
            if (plane.y > safeY) {
                plane.verticalSpeed += (-1.5 - plane.verticalSpeed) * 0.05;
            } else {
                plane.verticalSpeed *= 0.95;
            }
        }
    } else {
        // После второго множителя - СИСТЕМА 50/50
        if (distance >= 200) {
            // Решаем судьбу полёта в момент достижения 200м
            if (!fateDecided) {
                fateDecided = true;
                willCrash = Math.random() < 0.5; // 50/50 шанс!
                if (current && current.cheatMode) {
                    willCrash = false;
                }
                crashTimer = 0;
                console.log('Судьба решена:', willCrash ? 'ПАДЕНИЕ' : 'УСПЕШНАЯ ПОСАДКА');
            }
            
            // Для читинга, увеличиваем multiplier
            if (current && current.cheatMode && !willCrash) {
                currentMultiplier = Math.min(25, currentMultiplier + 0.1);
            }
            
            // Применяем судьбу
            if (willCrash) {
                // Самолёт будет падать
                crashTimer++;
                // Постепенно увеличиваем гравитацию
                const crashForce = Math.min(crashTimer * 0.002, 0.15);
                plane.verticalSpeed += crashForce;
                // Ограничиваем скорость падения для драматизма
                plane.verticalSpeed = Math.min(plane.verticalSpeed, 4);
            } else {
                // Самолёт долетит до авианосца
                // Ищем следующий авианосец
                const nextCarrier = carriers.find(c => c.x - scrollOffsetX > plane.x + 50);
                if (nextCarrier) {
                    const carrierScreenX = nextCarrier.x - scrollOffsetX;
                    const distToCarrier = carrierScreenX - plane.x;
                    const planeBottom = plane.y + plane.height;

                    // Параметры посадки
                    const landingStartDist = 180; // дистанция, при которой начинаем готовиться к посадке
                    const landingExecuteDist = 60; // дистанция для попытки финальной посадки
                    const landingY = nextCarrier.y - 22; // целевая Y над палубой
                    const diffY = landingY - plane.y;
                    const nextCarrierIndex = carriers.indexOf(nextCarrier);

                    // Инициируем режим посадки при приближении
                    if (!plane.isLanding && distToCarrier < landingStartDist) {
                        plane.isLanding = true;
                        plane.landingCarrierId = nextCarrierIndex;
                        // Решаем исход посадки
                        if (current && current.cheatMode) {
                            landingOutcome = 'success';
                        } else {
                            landingOutcome = ['success', 'crash_before', 'crash_after'][Math.floor(Math.random() * 3)];
                        }
                    }

                    // Если в режиме посадки и это тот же авианосец — аккуратно направляемся на палубу
                    if (plane.isLanding && plane.landingCarrierId === nextCarrierIndex) {
                        // Немного тормозим по горизонту, чтобы успеть сесть
                        plane.speed *= 0.995;

                        // Плавно корректируем вертикальную скорость к цели (без резких подъёмов)
                        plane.verticalSpeed += (diffY * 0.03 - plane.verticalSpeed) * 0.12;

                        // Если очень близко по горизонтали и вертикально в пределах допуска — приземляемся
                        if (landingOutcome === 'success' && distToCarrier < landingExecuteDist && planeBottom >= landingY - 8 && planeBottom <= landingY + 18 && plane.x > carrierScreenX + 15 && (plane.x + plane.width) < carrierScreenX + carrierWidth - 15) {
                            plane.isLanding = false;
                            plane.landingCarrierId = null;
                            land();
                            return;
                        }

                        // Crash before
                        if (landingOutcome === 'crash_before' && distToCarrier < landingExecuteDist) {
                            plane.isLanding = false;
                            plane.landingCarrierId = null;
                            crash();
                            return;
                        }

                        // Если пролетели дальше палубы не приземлившись — провал (crash)
                        if (carrierScreenX + carrierWidth < plane.x) {
                            plane.isLanding = false;
                            plane.landingCarrierId = null;
                            if (landingOutcome === 'crash_after') {
                                crash();
                            } else {
                                crash(); // для других, но success должен land
                            }
                            return;
                        }
                    } else {
                        // Обычное поведение: держим безопасную высоту, но не заставляем самолёт резко подниматься
                        if (distToCarrier < 400) {
                            // Корректируем только если нужно опуститься к палубе (diffY положительный)
                            if (diffY > -5) {
                                plane.verticalSpeed += (diffY * 0.01 - plane.verticalSpeed) * 0.05;
                            } else {
                                plane.verticalSpeed *= 0.98;
                            }
                        } else {
                            const safeY = canvas.height - 180;
                            if (plane.y > safeY) {
                                plane.verticalSpeed += (-1.2 - plane.verticalSpeed) * 0.05;
                            } else if (plane.y < 80) {
                                plane.verticalSpeed += (1 - plane.verticalSpeed) * 0.05;
                            } else {
                                plane.verticalSpeed *= 0.98;
                            }
                        }
                    }
                }
            }
        } else {
            // До 200м держим самолет на безопасной высоте
            const safeY = canvas.height - 180;
            if (plane.y > safeY) {
                plane.verticalSpeed += (-1.2 - plane.verticalSpeed) * 0.05;
            } else if (plane.y < 80) {
                plane.verticalSpeed += (1 - plane.verticalSpeed) * 0.05;
            } else {
                plane.verticalSpeed *= 0.98;
            }
        }
    }
    
    // Ограничение высоты
    if (plane.y < 50) {
        plane.y = 50;
        plane.verticalSpeed = Math.max(0, plane.verticalSpeed);
    }
    
    // Высота для отображения
    altitude = Math.max(0, Math.floor((canvas.height - plane.y - carrierHeight) / 2));
    
    // Генерация множителей (чаще - больше бонусов)
    if (secondMultiplierCollected && Math.random() < 0.025 && multipliers.length < 3) {
        // После 2-го множителя - появляются чаще (до 3 на экране)
        spawnMultiplier();
    } else if (firstMultiplierCollected && !secondMultiplierCollected && multipliers.length === 0) {
        // Создаем второй множитель после первого
        spawnMultiplier();
    } else if (!firstMultiplierCollected && multipliers.length === 0) {
        // Создаем первый множитель сразу после старта
        spawnMultiplier();
    }
    
    // Обновление фейерверков
    updateFireworks();
    
    // Генерация ракет (только после второго множителя и после 200м дистанции)
    if (secondMultiplierCollected && distance >= 200 && Math.random() < rocketSpawnChance && rockets.length < 3) {
        spawnRocket();
    }
    
    // Множители статичны в мировых координатах — не меняем их x здесь
    // (Экранная позиция рассчитывается как mult.x - scrollOffsetX при отрисовке и коллизиях)
    
    // Обновление ракет (статичные - только скролл с миром)
    // Ракеты не двигаются самостоятельно, просто скроллятся с миром
    
    // Проверка столкновений с множителями
    for (let i = multipliers.length - 1; i >= 0; i--) {
        const mult = multipliers[i];
        const screenX = mult.x - scrollOffsetX;
        if (checkCollision(plane, { x: screenX, y: mult.y, width: mult.width, height: mult.height })) {
            applyMultiplier(mult);
            multipliers.splice(i, 1);
        }
    }
    
    // Проверка столкновений с ракетами
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        const screenX = rocket.x - scrollOffsetX;
        if (checkCollision(plane, { x: screenX, y: rocket.y, width: rocket.width, height: rocket.height })) {
            hitRocket();
            rockets.splice(i, 1);
        }
    }
    
    // Проверка столкновения с авианосцем (границы посадки)
    for (const carrier of carriers) {
        const carrierScreenX = carrier.x - scrollOffsetX;

        // Проверяем только ближайшие авианосцы
        if (carrierScreenX < -carrierWidth || carrierScreenX > canvas.width + 100) continue;

        const planeBottom = plane.y + plane.height;
        const planeRight = plane.x + plane.width;
        const deckTop = carrier.y;
        const deckHeight = carrierHeight / 4; // Высота палубы

        // Сначала проверяем успешную посадку - даём приоритет посадке перед крашем
        const landingMargin = 20;
        if (plane.x > carrierScreenX + landingMargin && planeRight < carrierScreenX + carrierWidth - landingMargin) {
            // Самолёт над палубой — расширенный допуск по вертикали для надёжного срабатывания
            if (planeBottom >= deckTop - 5 && planeBottom <= deckTop + deckHeight + 60) {
                land();
                return;
            }
        }

        // Если посадка не случилась — проверяем серьёзный удар о корпус авианосца (CRASH)
        if (planeRight > carrierScreenX && plane.x < carrierScreenX + carrierWidth) {
            // Если самолёт опустился глубоко ниже дна палубы — это однозначный краш
            if (planeBottom > carrier.y + carrierHeight - 10) {
                crash();
                return;
            }
        }
    }
    
    // Проверка падения в океан
    if (plane.y > canvas.height - 30) {
        crash();
    }
    
    // Удаление объектов за пределами экрана
    for (let i = multipliers.length - 1; i >= 0; i--) {
        const mult = multipliers[i];
        if (mult.x < scrollOffsetX - 200) {
            multipliers.splice(i, 1);
        }
    }
    
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        // Удаляем ракеты, которые прошли мимо (слева от экрана)
        if (rocket.x < scrollOffsetX - 100) {
            rockets.splice(i, 1);
        }
    }
    
    // Создание новых авианосцев при необходимости
    const lastCarrier = carriers[carriers.length - 1];
    if (lastCarrier.x - scrollOffsetX < canvas.width + 500) {
        createNextCarrier();
    }
    
    updateUI();
}

// Создание множителя
function spawnMultiplier() {
    const type = multiplierTypes[Math.floor(Math.random() * multiplierTypes.length)];
    multipliers.push({
        x: scrollOffsetX + canvas.width + Math.random() * 300, // Впереди самолета
        y: Math.random() * (canvas.height - 200) + 50,
        width: 60,
        height: 60,
        type: type.type,
        value: type.value,
        color: type.color,
        symbol: type.symbol,
        glow: 0 // Для эффекта свечения
    });
}

// Создание ракеты (направлена на самолёт, только в воздухе)
function spawnRocket() {
    const rocketX = scrollOffsetX + canvas.width + Math.random() * 200;
    // Ракеты спавнятся только в воздухе (выше уровня авианосца)
    const minY = 50;
    const maxY = canvas.height - carrierHeight - 100; // Не ниже уровня палубы
    const rocketY = Math.random() * (maxY - minY) + minY;
    
    // Вычисляем угол к самолёту (ракета смотрит на него)
    const dx = plane.x - (rocketX - scrollOffsetX);
    const dy = (plane.y + plane.height / 2) - rocketY;
    const angleToPlane = Math.atan2(dy, dx);
    
    rockets.push({
        x: rocketX,
        y: rocketY,
        width: 40,
        height: 50,
        angle: angleToPlane,
        color: '#FF4500'
    });
}

// Применение множителя
function applyMultiplier(mult) {
    multipliersCollected++;
    
    // Отслеживаем первый и второй множители
    if (!firstMultiplierCollected) {
        firstMultiplierCollected = true;
    } else if (!secondMultiplierCollected) {
        secondMultiplierCollected = true;
    }
    
    if (mult.type === 'add') {
        currentWin += mult.value;
        // Множители поднимают самолет вверх (только в случайном режиме после 2-го)
        if (secondMultiplierCollected) {
            plane.verticalSpeed -= 3; // Плавный подъём
        }
    } else if (mult.type === 'mult') {
        currentMultiplier *= mult.value;
        if (secondMultiplierCollected) {
            plane.verticalSpeed -= 2.5; // Плавный подъём
        }
        
        // Ранее тут показывался МЕГА ВЫИГРЫШ сразу при сборе множителя.
        // Теперь показываем его только при успешной посадке и при множителе >= x25.
    } else if (mult.type === 'div') {
        currentMultiplier /= mult.value;
        currentWin = Math.floor(currentWin / mult.value);
        // Штрафной множитель опускает самолет плавно
        if (secondMultiplierCollected) {
            plane.verticalSpeed += 1.5; // Плавное падение
        }
    }
    updateCurrentWin();
}

// Попадание ракетой
function hitRocket() {
    currentWin = Math.floor(currentWin / 2);
    currentMultiplier = Math.max(1.0, currentMultiplier / 2);
    // Плавное падение после урона (не резкое)
    plane.verticalSpeed += 2; // Мягкий толчок вниз
    updateCurrentWin();
}

// Создание фейерверка
function spawnFirework(x, y) {
    const colors = ['#FF0000', '#FFD700', '#00FF00', '#00BFFF', '#FF00FF', '#FFA500'];
    const particleCount = 30 + Math.random() * 20;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
        const speed = 2 + Math.random() * 4;
        fireworks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 60 + Math.random() * 40,
            size: 2 + Math.random() * 3
        });
    }
}

// Обновление фейерверков
function updateFireworks() {
    // Обновление МЕГА ВЫИГРЫША
    if (megaWinActive) {
        megaWinTimer--;
        if (megaWinTimer <= 0) {
            megaWinActive = false;
        }
        // Спавн новых фейерверков
        if (Math.random() < 0.15) {
            spawnFirework(
                Math.random() * canvas.width,
                Math.random() * canvas.height * 0.6
            );
        }
    }
    
    // Обновление частиц
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const p = fireworks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Гравитация
        p.vx *= 0.98; // Затухание
        p.life--;
        
        if (p.life <= 0) {
            fireworks.splice(i, 1);
        }
    }
}

// Отрисовка фейерверков
function drawFireworks() {
    fireworks.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / 100;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Отрисовка надписи МЕГА ВЫИГРЫШ
function drawMegaWin() {
    if (!megaWinActive) return;
    
    ctx.save();

    // Тёмный полупрозрачный фон для акцента
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;
    const shake = Math.sin(Date.now() * 0.05) * 4;

    ctx.translate(canvas.width / 2 + shake, canvas.height / 3);
    ctx.scale(pulse, pulse);

    // Обводка текста
    ctx.font = '900 72px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Тёмная обводка
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.strokeText(currentLang === 'ru' ? '🎉 МЕГА ВЫЙГРЫШ!! 🎉' : '🎉 MEGA WIN!! 🎉', 0, 0);

    // Золотой градиент для текста
    const gradient = ctx.createLinearGradient(-300, -40, 300, 40);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFFF66');
    gradient.addColorStop(1, '#FFDD00');
    ctx.fillStyle = gradient;
    ctx.fillText(currentLang === 'ru' ? '🎉 МЕГА ВЫЙГРЫШ!! 🎉' : '🎉 MEGA WIN!! 🎉', 0, 0);

    // Множитель под текстом
    ctx.font = '700 44px Montserrat, Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText('x' + currentMultiplier.toFixed(2), 0, 80);
    ctx.fillStyle = '#00FF66';
    ctx.fillText('x' + currentMultiplier.toFixed(2), 0, 80);

    ctx.restore();
}

// Приземление
function land() {
    gameState = 'landed';
    const t = translations[currentLang];
    const totalWin = (currentBet * currentMultiplier + currentWin).toFixed(2);
    balance += parseFloat(totalWin);
    // Сохраняем баланс в аккаунте, если пользователь залогинен
    persistBalance();
    // Обновляем поле последнего выигрыша
    const lastWinEl = document.getElementById('lastWinValue');
    if (lastWinEl) lastWinEl.textContent = parseFloat(totalWin).toFixed(2);
    overlayTitle.textContent = t.successLanding;
    overlayMessage.textContent = `${t.youWon} ${totalWin} ${t.currency}!`;
    gameOverlay.classList.remove('hidden');
    playButton.disabled = false;
    setBetControlsEnabled(true); // Разблокируем ставки
    gameState = 'waiting'; // Сброс состояния
    if (isTelegramWebApp) window.Telegram.WebApp.MainButton.show();
    // Если это настоящий МЕГА ВЫИГРЫШ (множитель >= x25), показываем фейерверки и надпись
    if (currentMultiplier >= 25) {
        megaWinActive = true;
        megaWinTimer = 180; // ~3 секунды
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                spawnFirework(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height * 0.5
                );
            }, i * 200);
        }
        // Отложенный сброс игры, чтобы игрок увидел МЕГА-анимацию
        setTimeout(() => {
            megaWinActive = false;
            resetGame();
        }, 3500);
    } else {
        resetGame();
    }
}

// Крушение
function crash() {
    gameState = 'crashed';
    const t = translations[currentLang];
    overlayTitle.textContent = t.crashed;
    overlayMessage.textContent = t.crashedMessage;
    gameOverlay.classList.remove('hidden');
    playButton.disabled = false;
    setBetControlsEnabled(true); // Разблокируем ставки
    gameState = 'waiting'; // Сброс состояния
    if (isTelegramWebApp) window.Telegram.WebApp.MainButton.show();
    resetGame();
}

// Сброс игры
function resetGame() {
    plane.y = canvas.height - carrierHeight - 40;
    plane.verticalSpeed = 0;
    plane.x = 100;
    multipliers.length = 0;
    rockets.length = 0;
    currentWin = 0;
    currentMultiplier = 1.0;
    altitude = 0;
    distance = 0;
    scrollOffsetX = 0;
    firstMultiplierCollected = false;
    secondMultiplierCollected = false;
    multipliersCollected = 0;
    
    // Сброс анимации и системы 50/50
    takeoffProgress = 0;
    planeRotation = 0;
    fateDecided = false;
    willCrash = false;
    crashTimer = 0;
    turbulence = 0;
    takeoffWillFail = false;
    engineFailure = false;
    
    // Сброс фейерверков
    fireworks.length = 0;
    megaWinActive = false;
    megaWinTimer = 0;
    plane.isLanding = false;
    plane.landingCarrierId = null;
    
    updateUI();
}

// Обновление выигрыша
function updateCurrentWin() {
    const totalWin = (currentBet * currentMultiplier + currentWin).toFixed(2);
    currentWinDisplay.textContent = totalWin;
}

// Проверка столкновения
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Отрисовка облака
function drawCloud(cloud) {
    const screenX = cloud.x - scrollOffsetX * 0.3; // Параллакс - облака двигаются медленнее
    
    // Если облако ушло за левый край - перемещаем вправо
    if (screenX < -cloud.width) {
        cloud.x += canvas.width * 3 + cloud.width;
    }
    
    ctx.save();
    ctx.globalAlpha = cloud.opacity;
    ctx.fillStyle = '#FFFFFF';
    
    // Рисуем облако из нескольких эллипсов
    const cx = screenX;
    const cy = cloud.y;
    const w = cloud.width;
    const h = cloud.height;
    
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.4, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.25, cy - h * 0.15, w * 0.35, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.2, cy + h * 0.1, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.4, cy + h * 0.1, w * 0.25, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Отрисовка
function render() {
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Небо с плавным градиентом (тёмно-синий сверху -> голубой у горизонта)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#0a1628'); // Тёмно-синий верх
    skyGradient.addColorStop(0.4, '#1a3a5c'); // Средний синий
    skyGradient.addColorStop(0.7, '#2d5a7b'); // Светлее
    skyGradient.addColorStop(0.85, '#4a7c9b'); // Голубой у горизонта
    skyGradient.addColorStop(1, '#1a3050'); // Океан (темнее)
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Линия горизонта
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - carrierHeight);
    ctx.lineTo(canvas.width, canvas.height - carrierHeight);
    ctx.stroke();
    
    // Звезды (только в верхней части неба)
    drawStars();
    
    // Облака
    clouds.forEach(cloud => drawCloud(cloud));
    
    // Авианосцы (с учетом скролла)
    carriers.forEach(carrier => {
        const screenX = carrier.x - scrollOffsetX;
        if (screenX > -carrierWidth && screenX < canvas.width + carrierWidth) {
            drawCarrier(carrier, screenX);
        }
    });
    
    // Множители (с учетом скролла)
    multipliers.forEach(mult => {
        const screenX = mult.x - scrollOffsetX;
        if (screenX > -100 && screenX < canvas.width + 100) {
            mult.glow = (mult.glow + 0.1) % (Math.PI * 2);
            drawMultiplier(mult, screenX);
        }
    });
    
    // Ракеты (с учетом скролла)
    rockets.forEach(rocket => {
        const screenX = rocket.x - scrollOffsetX;
        if (screenX > -100 && screenX < canvas.width + 100) {
            drawRocket(rocket, screenX);
        }
    });
    
    // Самолет
    if (gameState === 'flying' || gameState === 'waiting' || gameState === 'takeoff') {
        drawPlane();
    }
    
    // Фейерверки
    drawFireworks();
    
    // МЕГА ВЫИГРЫШ
    drawMegaWin();
}

// Отрисовка самолета (красный) с поворотом
function drawPlane() {
    ctx.save();
    
    // Центр самолёта для вращения
    const centerX = plane.x + plane.width / 2;
    const centerY = plane.y + plane.height / 2;
    
    // Дымовой след (анимированный)
    const trailLength = 0.8 + Math.abs(plane.speed) * 0.2;
    const trailWave = Math.sin(Date.now() * 0.02) * 3;
    ctx.fillStyle = 'rgba(80, 80, 80, 0.25)';
    ctx.beginPath();
    ctx.ellipse(plane.x - plane.width * trailLength, plane.y + plane.height / 2 + trailWave, 
                plane.width * trailLength, plane.height * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Второй слой дыма
    ctx.fillStyle = 'rgba(60, 60, 60, 0.15)';
    ctx.beginPath();
    ctx.ellipse(plane.x - plane.width * (trailLength + 0.3), plane.y + plane.height / 2 - trailWave * 0.5, 
                plane.width * 0.6, plane.height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Применяем вращение
    ctx.translate(centerX, centerY);
    ctx.rotate(planeRotation);
    ctx.translate(-centerX, -centerY);
    
    const px = plane.x;
    const py = plane.y;
    const pw = plane.width;
    const ph = plane.height;
    
    // Обновляем угол пропеллера
    propellerAngle += engineFailure ? 0.1 : 0.5;
    
    // Чёрная обводка для всего самолёта
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Рисуем красный самолет с обводкой
    // Корпус (фюзеляж)
    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.ellipse(px + pw * 0.5, py + ph * 0.5, pw * 0.45, ph * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Нос самолета
    ctx.fillStyle = '#B22222';
    ctx.beginPath();
    ctx.moveTo(px + pw, py + ph * 0.5);
    ctx.lineTo(px + pw * 0.75, py + ph * 0.3);
    ctx.lineTo(px + pw * 0.75, py + ph * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Крылья (главные) с обводкой
    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.35, py + ph * 0.5);
    ctx.lineTo(px + pw * 0.2, py - ph * 0.1);
    ctx.lineTo(px + pw * 0.55, py + ph * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.35, py + ph * 0.5);
    ctx.lineTo(px + pw * 0.2, py + ph * 1.1);
    ctx.lineTo(px + pw * 0.55, py + ph * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Хвостовое оперение с обводкой
    ctx.fillStyle = '#B22222';
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.1, py + ph * 0.5);
    ctx.lineTo(px, py + ph * 0.1);
    ctx.lineTo(px + pw * 0.2, py + ph * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.1, py + ph * 0.5);
    ctx.lineTo(px, py + ph * 0.9);
    ctx.lineTo(px + pw * 0.2, py + ph * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Кабина пилота (окно)
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.ellipse(px + pw * 0.65, py + ph * 0.4, pw * 0.1, ph * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Блик на кабине
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(px + pw * 0.67, py + ph * 0.37, pw * 0.04, ph * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ПРОПЕЛЛЕР на носу
    ctx.save();
    ctx.translate(px + pw + 3, py + ph * 0.5);
    ctx.rotate(propellerAngle);
    
    // Втулка пропеллера
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Лопасти пропеллера (3 штуки)
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / 3) * i);
        
        // Лопасть
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.ellipse(0, -12, 3, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
    
    ctx.restore();
    
    // Двигатель (огонь) - анимированное пламя
    if (engineFailure) {
        // Отказ двигателя - чёрный дым и искры
        // Чёрный дым
        for (let i = 0; i < 3; i++) {
            const smokeX = px - pw * (0.3 + i * 0.25) + Math.sin(Date.now() * 0.01 + i) * 10;
            const smokeY = py + ph * 0.5 + Math.cos(Date.now() * 0.015 + i) * 8;
            const smokeSize = 8 + i * 5 + Math.sin(Date.now() * 0.02) * 3;
            ctx.fillStyle = `rgba(30, 30, 30, ${0.6 - i * 0.15})`;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Искры
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(px - pw * 0.1 + Math.random() * 10, py + ph * 0.5 + Math.random() * 10 - 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Слабое мерцающее пламя
        if (Math.random() > 0.3) {
            ctx.fillStyle = '#FF6600';
            ctx.beginPath();
            ctx.moveTo(px, py + ph * 0.45);
            ctx.lineTo(px - pw * 0.08, py + ph * 0.5);
            ctx.lineTo(px, py + ph * 0.55);
            ctx.closePath();
            ctx.fill();
        }
    } else {
        // Нормальное пламя
        const flameFlicker = Math.sin(Date.now() * 0.03) * 0.1 + 0.9;
        const flameLength = 0.2 + Math.abs(plane.speed) * 0.05 + flameFlicker * 0.05;
        
        // Внешнее пламя (оранжевое)
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(px, py + ph * 0.38);
        ctx.lineTo(px - pw * flameLength, py + ph * 0.5 + Math.sin(Date.now() * 0.05) * 2);
        ctx.lineTo(px, py + ph * 0.62);
        ctx.closePath();
        ctx.fill();
        
        // Среднее пламя (красно-оранжевое)
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(px, py + ph * 0.42);
        ctx.lineTo(px - pw * (flameLength * 0.7), py + ph * 0.5 + Math.sin(Date.now() * 0.07) * 1.5);
        ctx.lineTo(px, py + ph * 0.58);
        ctx.closePath();
        ctx.fill();
        
        // Внутреннее пламя (жёлтое/белое - самое горячее)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(px, py + ph * 0.46);
        ctx.lineTo(px - pw * (flameLength * 0.4), py + ph * 0.5);
        ctx.lineTo(px, py + ph * 0.54);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Отрисовка авианосца
function drawCarrier(carrier, screenX) {
    // Пиксельный/блочный стиль авианосца: красный корпус и светло-серый верх
    const hullHeight = Math.floor(carrier.height * 0.25);
    // Корпус (красный низ)
    ctx.fillStyle = '#a80000';
    ctx.fillRect(screenX, carrier.y + carrier.height - hullHeight, carrier.width, hullHeight);

    // Основной корпус (светло-серый)
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(screenX, carrier.y, carrier.width, carrier.height - hullHeight);

    // Рисуем палубу тёмным оттенком сверху корпуса
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(screenX + 6, carrier.y + 6, carrier.width - 12, Math.floor(carrier.height * 0.18));

    // Нарисовать палубные детали (аналог пиксельной полосы)
    ctx.fillStyle = '#7f7f7f';
    const stripeY = carrier.y + Math.floor(carrier.height * 0.07);
    ctx.fillRect(screenX + 20, stripeY, carrier.width - 40, 6);

    // Командирская рубка (остров)
    const islandX = screenX + Math.floor(carrier.width * 0.58);
    const islandBaseY = carrier.y - 2;
    // Ступенчатая структура
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(islandX, islandBaseY - 48, 24, 48);
    ctx.fillRect(islandX - 20, islandBaseY - 36, 18, 36);
    ctx.fillRect(islandX + 28, islandBaseY - 28, 16, 28);

    // Детали и полосы на острове
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(islandX + 4, islandBaseY - 42, 16, 6);
    ctx.fillRect(islandX - 16, islandBaseY - 28, 12, 4);
    ctx.fillRect(islandX + 30, islandBaseY - 20, 10, 3);

    // Малые окна/детали на корпусе
    ctx.fillStyle = '#333333';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(screenX + 12 + i * 36, carrier.y + carrier.height / 2 - 6, 10, 8);
    }

    // Набор пиксельных ступеней слева для сходства с референсом
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(screenX + 10, carrier.y + carrier.height - hullHeight - 8, 12, 8);
    ctx.fillRect(screenX + 22, carrier.y + carrier.height - hullHeight - 18, 10, 10);
}

// Отрисовка множителя (только текст с эффектами)
function drawMultiplier(mult, screenX) {
    ctx.save();
    
    const cx = screenX + mult.width / 2;
    const cy = mult.y + mult.height / 2;
    
    // Пульсация
    const pulse = Math.sin(mult.glow) * 0.15 + 1;
    const floatY = Math.sin(mult.glow * 0.5) * 5;
    
    ctx.translate(cx, cy + floatY);
    ctx.scale(pulse, pulse);
    
    // Тень/свечение под текстом
    ctx.shadowColor = mult.color;
    ctx.shadowBlur = 20;
    
    // Чёрная обводка текста
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(mult.symbol, 0, 0);
    
    // Цветной текст
    ctx.fillStyle = mult.color;
    ctx.fillText(mult.symbol, 0, 0);
    
    // Белый блик сверху
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(mult.symbol, 0, -2);
    
    ctx.restore();
}

// Отрисовка ракеты (направлена на самолёт)
function drawRocket(rocket, screenX) {
    ctx.save();
    ctx.translate(screenX + rocket.width / 2, rocket.y + rocket.height / 2);
    ctx.rotate(rocket.angle - Math.PI / 2);

    // Параметры для рисования (масштабируем по размерам объекта)
    const bodyW = Math.max(6, rocket.width * 0.35);
    const bodyH = Math.max(24, rocket.height * 0.9);
    const tailY = bodyH / 2;

    // Пламя сзади — длинный градиентный хвост
    const g = ctx.createLinearGradient(0, tailY, 0, tailY + Math.max(60, bodyH * 1.8));
    g.addColorStop(0, 'rgba(255,255,0,0.9)');
    g.addColorStop(0.4, 'rgba(255,140,0,0.95)');
    g.addColorStop(0.8, 'rgba(255,69,0,0.8)');
    g.addColorStop(1, 'rgba(255,69,0,0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, tailY);
    ctx.quadraticCurveTo(0, tailY + bodyH * 1.1, bodyW / 2, tailY);
    ctx.lineTo(bodyW / 2 + 6, tailY);
    ctx.quadraticCurveTo(0, tailY + bodyH * 1.25, -bodyW / 2 - 6, tailY);
    ctx.closePath();
    ctx.fill();

    // Тень ближе к телу (ярче центр)
    const g2 = ctx.createLinearGradient(0, tailY, 0, tailY + Math.max(40, bodyH * 1.1));
    g2.addColorStop(0, 'rgba(255,200,0,0.9)');
    g2.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 4, tailY);
    ctx.quadraticCurveTo(0, tailY + bodyH * 0.9, bodyW / 4, tailY);
    ctx.closePath();
    ctx.fill();

    // Корпус — основной серый прямоугольник
    ctx.fillStyle = '#A8A8A8';
    roundRect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 3);
    ctx.fill();

    // Полосы/детали на корпусе
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(-bodyW / 4, -bodyH / 6, bodyW / 2, Math.max(4, bodyH * 0.08));

    // Красные стабилизаторы/плавники по бокам
    ctx.fillStyle = '#c40000';
    // Левый
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 + 2, -bodyH * 0.05);
    ctx.lineTo(-bodyW / 2 - Math.max(8, bodyW * 0.6), 0);
    ctx.lineTo(-bodyW / 2 + 2, Math.max(8, bodyH * 0.15));
    ctx.closePath();
    ctx.fill();
    // Правый
    ctx.beginPath();
    ctx.moveTo(bodyW / 2 - 2, -bodyH * 0.05);
    ctx.lineTo(bodyW / 2 + Math.max(8, bodyW * 0.6), 0);
    ctx.lineTo(bodyW / 2 - 2, Math.max(8, bodyH * 0.15));
    ctx.closePath();
    ctx.fill();

    // Нос ракеты
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(0, -bodyH / 2 - 6);
    ctx.lineTo(-bodyW / 3, -bodyH / 4);
    ctx.lineTo(bodyW / 3, -bodyH / 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Вспомогательная функция: отрисовка скруглённого прямоугольника
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Отрисовка звезд (только в верхней части неба)
function drawStars() {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 80; i++) {
        const x = (i * 73.7 + scrollOffsetX * 0.02) % (canvas.width + 20) - 10;
        const y = (i * 47.3) % (canvas.height * 0.5); // Только верхняя половина
        const size = 0.5 + (i % 3) * 0.5;
        const twinkle = Math.sin(Date.now() * 0.003 + i) * 0.3 + 0.7;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Обновление UI
function updateUI() {
    console.log('updateUI called, multiplierDisplay:', multiplierDisplay);
    // Menu balance
    const menuBalance = document.getElementById('balance');
    if (menuBalance) menuBalance.textContent = balance.toFixed(2);
    
    // Game balance
    const gameBalance = document.getElementById('gameBalance');
    if (gameBalance) gameBalance.textContent = balance.toFixed(2);
    const gameCurrentWin = document.getElementById('gameCurrentWin');
    if (gameCurrentWin) gameCurrentWin.textContent = currentWin.toFixed(2);
    
    if (balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
    if (altitudeDisplay) altitudeDisplay.textContent = altitude.toFixed(1);
    if (multiplierDisplay) multiplierDisplay.textContent = 'x' + currentMultiplier.toFixed(2);
    if (distanceDisplay) distanceDisplay.textContent = distance.toFixed(1);
}

// Игровой цикл
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = 500;
});

// Стартовый экран: показываем 10 секунд загрузки, затем инициализируем игру
function startApp() {
    checkTelegramWebApp(); // Проверить Telegram Web App
    loadUsers().then(() => {
        const overlay = document.getElementById('startupOverlay');
        const loader = overlay ? overlay.querySelector('.loader') : null;
        // Показываем фиксированное сообщение без обратного отсчёта
        if (loader) loader.textContent = 'спасибо что выбрали нас';
        // Через 5 секунд скрываем оверлей и запускаем инициализацию
        setTimeout(() => {
            if (overlay) overlay.style.display = 'none';
            init();
        }, 5000);
    });
}

startApp();


