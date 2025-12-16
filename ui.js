/**
 * ============================================================================
 * PLINKO X - USER INTERFACE CONTROLLER (UI.JS)
 * ============================================================================
 * 
 * Version: 5.0.1-Enterprise
 * Build: Production
 * Author: SmartSoft Clone Team
 * 
 * Description:
 * Этот файл отвечает за весь визуальный слой приложения (View Layer).
 * Он не содержит бизнес-логики (она в panel.js и gamelogic.js), 
 * но отвечает за реактивное обновление DOM, анимации интерфейса,
 * отрисовку чата, истории и уведомлений.
 * 
 * Architecture:
 * - StateManager: Центральное хранилище данных интерфейса.
 * - DOMHelper: Библиотека манипуляции DOM.
 * - Components: Независимые классы для каждой части UI.
 * 
 * ============================================================================
 */

'use strict';

/* ==========================================================================
   SECTION 1: CONFIGURATION & LOCALIZATION
   ========================================================================== */

const UI_CONFIG = {
    animation: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        numberCountDuration: 1000 // ms
    },
    notifications: {
        maxCount: 5,
        timeout: 4000,
        position: 'top-right' // top-right, bottom-right, etc.
    },
    formatting: {
        currency: 'DMO',
        locale: 'ru-RU',
        precision: 2
    },
    theme: {
        current: 'dark',
        colors: {
            success: '#00b894',
            error: '#ff4757',
            warning: '#ffa502',
            info: '#0984e3'
        }
    }
};

/**
 * Словарь локализации.
 * В реальном приложении загружался бы через JSON.
 */
const I18N = {
    ru: {
        system: {
            welcome: 'Добро пожаловать в Plinko X',
            offline: 'Соединение потеряно',
            online: 'Вы в сети'
        },
        game: {
            bet: 'Ставка',
            win: 'Выигрыш',
            profit: 'Профит',
            chance: 'Шанс',
            playing: 'Шарик запущен...'
        },
        errors: {
            no_funds: 'Недостаточно средств на балансе',
            max_bet: 'Превышен лимит ставки',
            min_bet: 'Ниже минимальной ставки',
            network: 'Ошибка сети'
        },
        history: {
            title: 'История игр',
            empty: 'Пока нет ставок'
        }
    },
    en: {
        system: {
            welcome: 'Welcome to Plinko X',
            offline: 'Connection lost',
            online: 'Back online'
        },
        game: {
            bet: 'Bet',
            win: 'Win',
            profit: 'Profit',
            chance: 'Chance',
            playing: 'Ball dropped...'
        },
        errors: {
            no_funds: 'Insufficient funds',
            max_bet: 'Max bet limit exceeded',
            min_bet: 'Below min bet',
            network: 'Network error'
        },
        history: {
            title: 'Game History',
            empty: 'No bets yet'
        }
    }
};

/* ==========================================================================
   SECTION 2: REACTIVE STATE MANAGEMENT
   ========================================================================== */

/**
 * Простая реализация Observer Pattern.
 * Позволяет компонентам подписываться на изменения данных.
 */
class StateManager {
    constructor() {
        this.state = {
            balance: 20000.00,
            currentBet: 50.00,
            language: 'ru',
            isMuted: false,
            isAutoPlaying: false,
            onlineUsers: 1245
        };
        
        this.listeners = new Map();
        
        // Создаем прокси для автоматического уведомления подписчиков
        this.data = new Proxy(this.state, {
            set: (target, property, value) => {
                const oldValue = target[property];
                target[property] = value;
                
                if (oldValue !== value) {
                    this.notify(property, value, oldValue);
                }
                return true;
            }
        });
    }

    /**
     * Подписка на изменение конкретного свойства
     */
    subscribe(property, callback) {
        if (!this.listeners.has(property)) {
            this.listeners.set(property, []);
        }
        this.listeners.get(property).push(callback);
    }

    /**
     * Уведомление подписчиков
     */
    notify(property, newValue, oldValue) {
        if (this.listeners.has(property)) {
            this.listeners.get(property).forEach(cb => cb(newValue, oldValue));
        }
        
        // Глобальный слушатель (для дебага)
        // console.log(`[State] ${property} changed: ${oldValue} -> ${newValue}`);
    }

    // Геттеры и Сеттеры для удобства
    get balance() { return this.data.balance; }
    set balance(val) { this.data.balance = val; }

    get currentBet() { return this.data.currentBet; }
    set currentBet(val) { this.data.currentBet = val; }
}

const Store = new StateManager();

/* ==========================================================================
   SECTION 3: DOM & UTILITY HELPERS
   ========================================================================== */

class DOMHelper {
    /**
     * Создает элемент с атрибутами и детьми
     * @param {string} tag - Тег элемента (div, span, etc)
     * @param {object} attrs - Объект с атрибутами (class, id, data-*)
     * @param {array} children - Массив дочерних элементов или строк
     */
    static create(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        
        // Установка атрибутов
        Object.keys(attrs).forEach(key => {
            if (key === 'class') {
                el.className = attrs[key];
            } else if (key === 'style' && typeof attrs[key] === 'object') {
                Object.assign(el.style, attrs[key]);
            } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
                el.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
            } else {
                el.setAttribute(key, attrs[key]);
            }
        });

        // Добавление детей
        children.forEach(child => {
            if (typeof child === 'string' || typeof child === 'number') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });

        return el;
    }

    /**
     * Анимирует число в элементе (Count Up)
     */
    static animateNumber(element, start, end, duration = 1000, formatter = null) {
        if (!element) return;
        
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (EaseOutQuart)
            const ease = 1 - Math.pow(1 - progress, 4);
            
            const currentVal = start + (end - start) * ease;
            
            element.innerText = formatter ? formatter(currentVal) : currentVal.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.innerText = formatter ? formatter(end) : end.toFixed(2);
            }
        };
        
        requestAnimationFrame(update);
    }

    /**
     * Форматирует валюту
     */
    static formatMoney(value) {
        return new Intl.NumberFormat(UI_CONFIG.formatting.locale, {
            minimumFractionDigits: UI_CONFIG.formatting.precision,
            maximumFractionDigits: UI_CONFIG.formatting.precision
        }).format(value);
    }

    /**
     * Безопасный поиск элемента
     */
    static get(selector) {
        const el = document.querySelector(selector);
        if (!el) console.warn(`Element not found: ${selector}`);
        return el;
    }
}

/* ==========================================================================
   SECTION 4: COMPONENT - TOAST NOTIFICATIONS
   ========================================================================== */

class ToastManager {
    constructor() {
        this.container = DOMHelper.create('div', {
            class: 'toast-container',
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '9999',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }
        });
        document.body.appendChild(this.container);
        this.toasts = [];
    }

    show(message, type = 'info', title = null) {
        // Ограничение количества
        if (this.toasts.length >= UI_CONFIG.notifications.maxCount) {
            this.remove(this.toasts[0].id);
        }

        const id = Date.now().toString();
        const icon = this.getIcon(type);
        const color = UI_CONFIG.theme.colors[type] || UI_CONFIG.theme.colors.info;

        // Создание DOM тоста
        const toastEl = DOMHelper.create('div', {
            class: `toast toast-${type}`,
            id: `toast-${id}`,
            style: {
                background: '#1e1e30',
                borderLeft: `4px solid ${color}`,
                padding: '15px 20px',
                borderRadius: '4px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                color: 'white',
                minWidth: '250px',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s',
                opacity: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }
        }, [
            DOMHelper.create('div', { class: 'toast-icon', style: { color: color, fontSize: '20px' } }, [icon]),
            DOMHelper.create('div', { class: 'toast-content' }, [
                title ? DOMHelper.create('div', { style: { fontWeight: 'bold', marginBottom: '2px' } }, [title]) : '',
                DOMHelper.create('div', { style: { fontSize: '13px', color: '#ccc' } }, [message])
            ])
        ]);

        this.container.appendChild(toastEl);
        
        // Trigger reflow
        toastEl.offsetHeight;
        
        // Animation IN
        toastEl.style.transform = 'translateX(0)';
        toastEl.style.opacity = '1';

        this.toasts.push({ id, el: toastEl });

        // Auto remove
        setTimeout(() => this.remove(id), UI_CONFIG.notifications.timeout);
    }

    remove(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;

        const toast = this.toasts[index];
        
        // Animation OUT
        toast.el.style.transform = 'translateX(120%)';
        toast.el.style.opacity = '0';

        setTimeout(() => {
            if (toast.el.parentNode) {
                toast.el.parentNode.removeChild(toast.el);
            }
            this.toasts = this.toasts.filter(t => t.id !== id);
        }, 300);
    }

    getIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    }

    // Шорткаты
    success(msg) { this.show(msg, 'success', 'Успех'); }
    error(msg) { this.show(msg, 'error', 'Ошибка'); }
    info(msg) { this.show(msg, 'info', 'Информация'); }
}

const Toaster = new ToastManager();

/* ==========================================================================
   SECTION 5: COMPONENT - BALANCE DISPLAY
   ========================================================================== */

class BalanceDisplay {
    constructor() {
        this.element = document.getElementById('balance');
        this.container = document.querySelector('.wallet-display');
        this.currentValue = Store.balance;

        // Подписываемся на изменения баланса
        Store.subscribe('balance', (newVal, oldVal) => {
            this.update(newVal, oldVal);
        });
    }

    update(newValue, oldValue) {
        if (!this.element) return;

        // Визуальный эффект на контейнере (вспышка)
        if (newValue > oldValue) {
            this.highlight('success');
        } else if (newValue < oldValue) {
            this.highlight('neutral'); // Или warning при трате
        }

        // Анимация чисел
        DOMHelper.animateNumber(
            this.element, 
            oldValue, 
            newValue, 
            UI_CONFIG.animation.numberCountDuration, 
            DOMHelper.formatMoney
        );
    }

    highlight(type) {
        if (!this.container) return;
        
        const color = type === 'success' ? 'rgba(0, 184, 148, 0.2)' : 'rgba(255, 255, 255, 0.1)';
        
        this.container.style.transition = 'background-color 0.1s';
        this.container.style.backgroundColor = color;
        
        setTimeout(() => {
            this.container.style.transition = 'background-color 0.5s';
            this.container.style.backgroundColor = ''; // Сброс к CSS
        }, 200);
    }
}

/* ==========================================================================
   SECTION 6: COMPONENT - GAME MULTIPLIERS RENDERER
   ========================================================================== */

class GameMultipliers {
    constructor() {
        this.container = document.getElementById('multipliers-container');
    }

    /**
     * Основная функция инициализации слотов внизу поля.
     * Вызывается из MathConfig/PanelController при изменении рядов.
     */
    init() {
        if (!this.container) return;
        
        // Очистка
        this.container.innerHTML = '';
        
        // Получаем актуальные множители из конфига
        const multipliers = MathConfig.multipliers; // Глобальный объект
        
        if (!multipliers || !multipliers.length) return;

        // Генерируем блоки
        multipliers.forEach((val, index) => {
            const block = this.createBlock(val);
            this.container.appendChild(block);
        });

        // Анимация появления
        this.animateEntrance();
    }

    createBlock(value) {
        // Определение класса стиля в зависимости от значения
        let cssClass = 'mult-low';
        if (value >= 2) cssClass = 'mult-med';
        if (value >= 10) cssClass = 'mult-high';
        if (value >= 50) cssClass = 'mult-mega';

        // Создаем элемент через DOMHelper
        const el = DOMHelper.create('div', {
            class: `mult-block ${cssClass}`,
            'data-val': value
        }, [value + 'x']); // 'x' добавляем как текст

        return el;
    }

    animateEntrance() {
        const children = Array.from(this.container.children);
        const center = Math.floor(children.length / 2);

        children.forEach((child, i) => {
            // Задержка анимации от центра к краям
            const dist = Math.abs(i - center);
            const delay = dist * 50; 
            
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                child.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, delay);
        });
    }
}

/* ==========================================================================
   SECTION 7: COMPONENT - HISTORY TABLE
   ========================================================================== */

class HistoryRenderer {
    constructor() {
        this.table = document.getElementById('history-table');
        this.maxRows = 50;
    }

    /**
     * Добавление новой записи в историю
     * Используется PanelController/GameLogic
     */
    addRecord(data) {
        if (!this.table) return;

        // Создаем DOM элемент ряда
        const row = this.createRow(data);
        
        // Вставляем в начало (prepend)
        if (this.table.firstChild) {
            this.table.insertBefore(row, this.table.firstChild);
        } else {
            this.table.appendChild(row);
        }

        // Удаление лишних строк
        if (this.table.children.length > this.maxRows) {
            this.table.removeChild(this.table.lastChild);
        }
    }

    createRow(data) {
        /* data = { user, time, bet, multiplier, payout, win } */
        
        const isWin = data.win;
        const payoutClass = isWin ? 'text-win' : 'text-lose';
        
        // Определяем цвет множителя
        let multClass = 'text-low';
        if (data.multiplier >= 2) multClass = 'text-med';
        if (data.multiplier >= 10) multClass = 'text-high';

        const row = DOMHelper.create('div', {
            class: `table-row ${isWin ? 'win' : 'lose'} new`,
            style: {
                // Inline стиль для начальной анимации (JS-driven)
                opacity: '0',
                transform: 'translateY(-10px)'
            }
        }, [
            DOMHelper.create('div', { class: 'col-game' }, ['Plinko X']),
            DOMHelper.create('div', { class: 'col-user hidden-name' }, [data.user || 'Hidden']),
            DOMHelper.create('div', { class: 'col-time' }, [data.time || new Date().toLocaleTimeString()]),
            DOMHelper.create('div', { class: 'col-bet' }, [DOMHelper.formatMoney(data.bet)]),
            DOMHelper.create('div', { class: `col-mult ${multClass}` }, [`${data.multiplier}x`]),
            DOMHelper.create('div', { class: `col-payout ${payoutClass}` }, [DOMHelper.formatMoney(data.payout)])
        ]);

        // Анимация появления
        requestAnimationFrame(() => {
            // Force reflow
            row.offsetHeight; 
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
            
            // Убираем класс new через время
            setTimeout(() => row.classList.remove('new'), 500);
        });

        return row;
    }
}

/* ==========================================================================
   SECTION 8: COMPONENT - WIN NOTIFICATION (BIG POPUP)
   ========================================================================== */

class WinPopup {
    constructor() {
        // Создаем контейнер для оверлеев если нет
        this.overlay = DOMHelper.get('#win-overlay');
        if (!this.overlay) {
            this.overlay = DOMHelper.create('div', {
                id: 'win-overlay',
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // Чтобы клики проходили сквозь
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: '50'
                }
            });
            // Вставляем в .game-display-area
            const gameArea = document.querySelector('.game-display-area');
            if (gameArea) gameArea.appendChild(this.overlay);
            else document.body.appendChild(this.overlay);
        }
    }

    show(amount, multiplier) {
        if (amount <= 0) return;

        // Если множитель маленький, не показываем большой попап, 
        // просто обновляем баланс (это делает BalanceDisplay)
        if (multiplier < 2) return;

        // Создаем элемент попапа
        const popup = DOMHelper.create('div', {
            class: 'win-popup',
            style: {
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '20px 40px',
                borderRadius: '15px',
                border: '2px solid #00b894',
                color: '#fff',
                textAlign: 'center',
                boxShadow: '0 0 30
