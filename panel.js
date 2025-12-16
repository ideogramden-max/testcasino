/**
 * ============================================================================
 * PLINKO X - CONTROL PANEL LOGIC & UI CONTROLLER
 * ============================================================================
 * 
 * Version: 2.0.4-Release
 * Build Date: 2023-10-25
 * Author: SmartSoft Clone Team
 * 
 * Description:
 * Этот файл отвечает за все взаимодействие пользователя с интерфейсом,
 * обработку кликов, валидацию форм, логику авто-ставок, эмуляцию чата
 * и обновление статистики в реальном времени.
 * 
 * Dependencies:
 * - mathematics.js (Global MathConfig)
 * - gamelogic.js (Global GameLogic)
 * - ui.js (Global UI)
 */

'use strict';

/* ==========================================================================
   1. GLOBAL CONFIGURATION & CONSTANTS
   ========================================================================== */

const APP_CONFIG = {
    debug: true,
    limits: {
        minBet: 0.10,
        maxBet: 1000.00,
        maxProfit: 500000.00,
        defaultBet: 50.00,
        rows: [8, 10, 12, 14, 16],
        risks: ['low', 'normal', 'high']
    },
    autoBet: {
        maxSpeed: 100, // мс между ставками в турбо режиме
        normalSpeed: 400
    },
    sounds: {
        click: 'assets/sounds/click.mp3',
        win: 'assets/sounds/win.mp3',
        drop: 'assets/sounds/drop.mp3',
        error: 'assets/sounds/error.mp3'
    },
    ui: {
        toastDuration: 3000,
        scrollLimit: 50
    },
    mock: {
        chatDelay: { min: 2000, max: 8000 }
    }
};

/**
 * Вспомогательный класс для логирования
 */
class Logger {
    static info(module, message, data = '') {
        if (APP_CONFIG.debug) {
            console.log(`%c[${module}] %c${message}`, 'color: #00e5ff; font-weight: bold;', 'color: #fff;', data);
        }
    }

    static warn(module, message) {
        console.warn(`%c[${module}] %c${message}`, 'color: #ff9f43; font-weight: bold;', 'color: #ff9f43;');
    }

    static error(module, message, error) {
        console.error(`%c[${module}] %c${message}`, 'color: #ff4757; font-weight: bold;', 'color: #ff4757;', error);
    }
}

/* ==========================================================================
   2. UTILITIES & HELPERS
   ========================================================================== */

const Utils = {
    /**
     * Форматирование денег
     */
    formatMoney: (amount) => {
        return parseFloat(amount).toFixed(2);
    },

    /**
     * Случайное число в диапазоне
     */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Выбор случайного элемента из массива
     */
    randomArrayItem: (arr) => {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Debounce функция для оптимизации ввода
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Генерация случайного ID сессии
     */
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Безопасный парсинг Float
     */
    parseFloatSecure: (value) => {
        const parsed = parseFloat(value);
        if (isNaN(parsed) || !isFinite(parsed)) return 0;
        return parsed;
    }
};

/* ==========================================================================
   3. EVENT BUS (PUB/SUB PATTERN)
   ========================================================================== */

/**
 * Шина событий для связи между UI, логикой игры и математикой
 * без жесткой связности (decoupling).
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    subscribe(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return {
            unsubscribe: () => {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            }
        };
    }

    publish(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}

const globalBus = new EventBus();

/* ==========================================================================
   4. STORAGE MANAGER
   ========================================================================== */

class StorageManager {
    constructor() {
        this.prefix = 'plinko_game_';
        this.defaults = {
            soundEnabled: true,
            musicEnabled: false,
            animationsEnabled: true,
            hotkeysEnabled: true
        };
    }

    save(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (e) {
            Logger.error('Storage', 'Save failed', e);
        }
    }

    load(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : this.defaults[key];
        } catch (e) {
            Logger.error('Storage', 'Load failed', e);
            return null;
        }
    }

    reset() {
        localStorage.clear();
    }
}

const storage = new StorageManager();

/* ==========================================================================
   5. SOUND CONTROLLER
   ========================================================================== */

class SoundController {
    constructor() {
        this.enabled = storage.load('soundEnabled');
        this.musicEnabled = storage.load('musicEnabled');
        this.sounds = {};
        
        // В реальном проекте здесь была бы предзагрузка AudioContext
        // Для примера используем заглушку, чтобы код не падал без файлов
    }

    play(soundKey) {
        if (!this.enabled) return;

        // Эмуляция проигрывания (так как файлов нет)
        // Logger.info('Sound', `Playing: ${soundKey}`);
        
        /* 
        const audio = new Audio(APP_CONFIG.sounds[soundKey]);
        audio.volume = 0.5;
        audio.play().catch(e => {}); 
        */
    }

    toggleSound(state) {
        this.enabled = state;
        storage.save('soundEnabled', state);
        Logger.info('Sound', `Sound enabled: ${state}`);
    }

    toggleMusic(state) {
        this.musicEnabled = state;
        storage.save('musicEnabled', state);
    }
}

const audioManager = new SoundController();

/* ==========================================================================
   6. INPUT VALIDATION SERVICE
   ========================================================================== */

class InputValidator {
    constructor() {
        this.inputElement = document.getElementById('bet-input');
        this.setupListeners();
    }

    setupListeners() {
        if(!this.inputElement) return;

        // Форматирование при потере фокуса
        this.inputElement.addEventListener('blur', () => {
            let val = Utils.parseFloatSecure(this.inputElement.value);
            this.validateAndFix(val);
        });

        // Запрет ввода недопустимых символов
        this.inputElement.addEventListener('input', (e) => {
            // Удаляем все кроме цифр и точки
            e.target.value = e.target.value.replace(/[^0-9.]/g, '');
            
            // Запрет второй точки
            if ((e.target.value.match(/\./g) || []).length > 1) {
                e.target.value = e.target.value.slice(0, -1);
            }
        });
    }

    validateAndFix(amount) {
        let finalAmount = amount;

        if (finalAmount < APP_CONFIG.limits.minBet) {
            finalAmount = APP_CONFIG.limits.minBet;
        } else if (finalAmount > APP_CONFIG.limits.maxBet) {
            finalAmount = APP_CONFIG.limits.maxBet;
        }

        // Обновляем UI
        this.inputElement.value = Utils.formatMoney(finalAmount);
        
        // Обновляем глобальное состояние
        if (window.UI) {
            window.UI.updateBetAmount(finalAmount);
        }

        return finalAmount;
    }

    getCurrentValue() {
        return Utils.parseFloatSecure(this.inputElement.value);
    }

    setValue(value) {
        const validated = this.validateAndFix(value);
        this.inputElement.value = Utils.formatMoney(validated);
        // Триггер события изменения для других слушателей
        this.inputElement.dispatchEvent(new Event('change'));
    }
}

/* ==========================================================================
   7. AUTO BETTING ENGINE (The "Brain")
   ========================================================================== */

/**
 * Класс, управляющий логикой автоматических ставок.
 * Реализует стратегии OnWin / OnLoss.
 */
class AutoBetEngine {
    constructor(gameController) {
        this.gameController = gameController;
        this.active = false;
        this.params = {
            totalBets: 0, // 0 = бесконечно
            stopWin: 0,
            stopLoss: 0,
            onWinAction: 'reset', // 'reset' | 'increase'
            onWinValue: 0,
            onLossAction: 'reset',
            onLossValue: 0
        };
        
        this.stats = {
            betsCount: 0,
            totalProfit: 0,
            startBalance: 0
        };

        this.timer = null;
    }

    /**
     * Считывает настройки из UI и запускает процесс
     */
    start() {
        if (this.active) return;
        
        // Считываем DOM элементы настроек авто
        const settingsDiv = document.getElementById('auto-settings');
        const inputs = settingsDiv.querySelectorAll('input');
        
        this.params.totalBets = parseInt(inputs[0].value) || 0;
        this.params.stopWin = parseFloat(inputs[1].value) || 0;
        this.params.stopLoss = parseFloat(inputs[2].value) || 0;

        // Фиксация начального состояния
        this.stats.betsCount = 0;
        this.stats.totalProfit = 0;
        this.stats.startBalance = window.UI.getBalance();
        this.active = true;

        Logger.info('AutoBot', 'Engine Started', this.params);
        
        // Блокируем UI
        this.toggleUI(true);
        
        // Запускаем цикл
        this.loop();
    }

    stop() {
        if (!this.active) return;
        
        this.active = false;
        clearTimeout(this.timer);
        
        Logger.info('AutoBot', 'Engine Stopped');
        this.toggleUI(false);
        
        // Обновляем текст кнопки
        const btn = document.getElementById('btn-auto-start');
        if(btn) btn.innerText = 'ЗАПУСТИТЬ АВТО';
    }

    toggleUI(locked) {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(el => el.disabled = locked);
        
        const btn = document.getElementById('btn-auto-start');
        if(btn) {
            btn.innerText = locked ? 'СТОП АВТО' : 'ЗАПУСТИТЬ АВТО';
            if(locked) btn.classList.add('active-red');
            else btn.classList.remove('active-red');
        }
    }

    async loop() {
        if (!this.active) return;

        // Проверка ограничений кол-ва ставок
        if (this.params.totalBets > 0 && this.stats.betsCount >= this.params.totalBets) {
            Logger.info('AutoBot', 'Limit reached: Total Bets');
            this.stop();
            return;
        }

        // Проверка баланса (стоп-лосс / тейк-профит)
        const currentBalance = window.UI.getBalance();
        const profit = currentBalance - this.stats.startBalance;

        if (this.params.stopWin > 0 && profit >= this.params.stopWin) {
            Logger.info('AutoBot', 'Limit reached: Take Profit');
            this.stop();
            return;
        }

        if (this.params.stopLoss > 0 && profit <= -this.params.stopLoss) {
            Logger.info('AutoBot', 'Limit reached: Stop Loss');
            this.stop();
            return;
        }

        // Попытка сделать ставку
        const betSuccess = this.gameController.placeBet();
        
        if (betSuccess) {
            this.stats.betsCount++;
            // Скорость авто-ставок
            this.timer = setTimeout(() => this.loop(), APP_CONFIG.autoBet.normalSpeed);
        } else {
            // Если денег нет или ошибка
            Logger.warn('AutoBot', 'Bet failed, stopping');
            this.stop();
        }
    }

    // Метод вызывается из GameLogic при завершении раунда
    processResult(winAmount, betAmount) {
        if (!this.active) return;

        const isWin = winAmount > betAmount;
        // Здесь можно реализовать логику изменения ставки (Мартингейл и т.д.)
        // Пока оставим базовую логику
    }
}

/* ==========================================================================
   8. CHAT SYSTEM SIMULATION
   ========================================================================== */

class ChatSystem {
    constructor() {
        this.container = document.querySelector('.chat-messages');
        this.input = document.querySelector('.chat-input-area input');
        this.sendBtn = document.querySelector('.btn-send');
        
        this.botNames = ['CryptoKing', 'LuckyDog', 'PlinkoMaster', 'TeslaFan', 'MoonBoy', 'SatoshiN', 'Vitalik_Eth', 'Whale_01', 'Sniper_X', 'Alice_Wonder'];
        this.messages = [
            'Nice win!', 'Rigged lol', 'Keep going!', 'Anyone winning?', 'Just lost 100 dmo :(', 
            'To the moon!', 'x1000 is coming, I can feel it', 'Fake site?', 'Withdrawals are fast today', 
            'Plinko god help me', 'Snipped the 130x!', 'GG', 'GL all', 'Need high risk', 'Which strat is best?'
        ];

        this.init();
    }

    init() {
        if (!this.container) return;

        // Слушатели отправки
        this.sendBtn.addEventListener('click', () => this.sendUserMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendUserMessage();
        });

        // Запуск ботов
        this.scheduleBotMessage();
    }

    scheduleBotMessage() {
        const delay = Utils.randomInt(APP_CONFIG.mock.chatDelay.min, APP_CONFIG.mock.chatDelay.max);
        setTimeout(() => {
            this.addBotMessage();
            this.scheduleBotMessage();
        }, delay);
    }

    addBotMessage() {
        const name = Utils.randomArrayItem(this.botNames);
        const text = Utils.randomArrayItem(this.messages);
        const lvl = Utils.randomInt(1, 99);
        // Генерация цвета аватара
        const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        const html = `
            <div class="msg-user">
                <div class="msg-avatar" style="background: ${color}">${name[0]}</div>
                <div class="msg-content">
                    <div class="msg-name">${name} <span class="lvl">${lvl}</span></div>
                    <div class="msg-text">${text}</div>
                </div>
            </div>
        `;
        
        this.appendHTML(html);
    }

    sendUserMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        const html = `
            <div class="msg-user">
                <div class="msg-avatar" style="background: #6c5dd3">Y</div>
                <div class="msg-content">
                    <div class="msg-name">You <span class="lvl">1</span></div>
                    <div class="msg-text" style="color: white;">${text}</div>
                </div>
            </div>
        `;

        this.appendHTML(html);
        this.input.value = '';
    }

    appendHTML(htmlString) {
        // Конвертация строки в DOM
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        const element = div.firstChild;

        this.container.appendChild(element);
        this.scrollToBottom();

        // Очистка старых сообщений если их много
        if (this.container.children.length > 50) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }
}

/* ==========================================================================
   9. HISTORY MANAGER
   ========================================================================== */

class HistoryManager {
    constructor() {
        this.tableBody = document.getElementById('history-table');
    }

    addRecord(gameData) {
        /*
         gameData format:
         {
            user: "Hidden",
            bet: 50.00,
            multiplier: 2.0,
            payout: 100.00,
            win: true
         }
        */
        if (!this.tableBody) return;

        const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        const multClass = this.getMultClass(gameData.multiplier);
        const rowClass = gameData.win ? 'win' : 'lose';
        const payoutClass = gameData.win ? 'text-win' : 'text-lose';
        
        const row = document.createElement('div');
        row.className = `table-row new ${rowClass}`;
        
        row.innerHTML = `
            <div class="col-game">Plinko X</div>
            <div class="col-user hidden-name">${gameData.user || 'User'}</div>
            <div class="col-time">${time}</div>
            <div class="col-bet">${Utils.formatMoney(gameData.bet)}</div>
            <div class="col-mult ${multClass}">${gameData.multiplier}x</div>
            <div class="col-payout ${payoutClass}">${Utils.formatMoney(gameData.payout)}</div>
        `;

        // Вставляем в начало
        this.tableBody.insertBefore(row, this.tableBody.firstChild);

        // Удаляем класс анимации через время
        setTimeout(() => row.classList.remove('new'), 500);

        // Лимит записей
        if (this.tableBody.children.length > APP_CONFIG.ui.scrollLimit) {
            this.tableBody.removeChild(this.tableBody.lastChild);
        }
    }

    getMultClass(mult) {
        if (mult < 1) return 'text-low';
        if (mult < 10) return 'text-med';
        return 'text-high';
    }
}

/* ==========================================================================
   10. MAIN PANEL CONTROLLER (ORCHESTRATOR)
   ========================================================================== */

class PanelController {
    constructor() {
        this.validator = new InputValidator();
        this.autoEngine = new AutoBetEngine(this);
        this.chat = new ChatSystem();
        this.history = new HistoryManager();
        
        // DOM Elements
        this.btnPlay = document.getElementById('btn-play');
        this.btnAutoStart = document.getElementById('btn-auto-start');
        
        this.btnHalf = document.querySelector('.btn-half');
        this.btnDouble = document.querySelector('.btn-double');
        
        this.riskSelect = document.getElementById('risk-select');
        this.rowsSelect = document.getElementById('rows-select');
        
        this.quickBets = document.querySelectorAll('.quick-bet-btn');
        this.modeTabs = document.querySelectorAll('.mode-tab');
        
        this.modals = {
            settings: document.getElementById('modal-settings'),
            fairness: document.getElementById('modal-fairness')
        };

        this.init();
    }

    init() {
        Logger.info('Panel', 'Initializing...');
        this.bindEvents();
        this.initHotkeys();
        this.bindModals();
        
        // Подписка на события выигрыша из GameLogic (через EventBus или глобально)
        // В нашем случае gamelogic.js вызывает UI методы напрямую, 
        // но мы можем перехватить их через обертку, если бы писали с нуля.
        // Для совместимости с gamelogic.js из прошлого ответа, 
        // мы добавим хук в window.UI.
        
        this.setu
