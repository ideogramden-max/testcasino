/**
 * ============================================================================
 * PLINKO X - HIGH PERFORMANCE GAME ENGINE
 * ============================================================================
 * 
 * Version: 4.5.2-Stable
 * Module: Game Logic & Rendering
 * 
 * Description:
 * Центральный контроллер игры. Отвечает за:
 * 1. Игровой цикл (Game Loop) с фиксированным шагом времени.
 * 2. Рендеринг графики на Canvas (60+ FPS).
 * 3. Физическую симуляцию шариков и коллизий.
 * 4. Систему частиц и визуальных эффектов.
 * 
 * Dependencies:
 * - mathematics.js (Vector2, MathConfig)
 * - ui.js (Interface updates)
 * 
 * Author: SmartSoft Clone Team
 * ============================================================================
 */

'use strict';

/* ==========================================================================
   1. VISUAL CONFIGURATION (THEME & ASSETS)
   ========================================================================== */

const RenderConfig = {
    // Основные цвета
    colors: {
        background: '#0f0f1f',
        pegIdle: 'rgba(255, 255, 255, 0.2)',
        pegActive: '#ffffff',
        pegGlow: '#6c5dd3',
        ball: '#ff0055',
        ballGlow: '#ff0055',
        trail: 'rgba(255, 0, 85, 0.5)',
        text: '#ffffff',
        
        // Градиенты множителей
        multLow: ['#f39c12', '#d35400'],
        multMed: ['#e74c3c', '#c0392b'],
        multHigh: ['#9b59b6', '#8e44ad'],
        multMega: ['#ff00cc', '#333399']
    },
    
    // Настройки частиц
    particles: {
        maxCount: 1000,
        sparkLife: 40,
        winExplosionCount: 50
    },

    // Настройки камеры
    camera: {
        shakeDecay: 0.9,
        shakeMax: 10
    },

    // Дебаг
    debug: {
        showGrid: false,
        showVelocity: false,
        showColliders: false
    }
};

/* ==========================================================================
   2. RENDERER ENGINE (LAYER MANAGER)
   ========================================================================== */

/**
 * Класс, отвечающий за отрисовку и управление канвасом.
 * Поддерживает масштабирование под DPI экрана (Retina fix).
 */
class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error('Canvas not found');
        
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Opt: alpha false faster
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        
        // Камера
        this.cameraOffset = { x: 0, y: 0 };
        this.shakeStrength = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;

        // Коррекция для четкости на HiDPI экранах
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        
        // Уведомляем игру, что размер изменился (нужен пересчет позиций)
        if (GameLogic) GameLogic.onResize(this.width, this.height);
    }

    clear() {
        this.ctx.fillStyle = RenderConfig.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Применение тряски камеры
    beginFrame() {
        this.clear();
        
        if (this.shakeStrength > 0.1) {
            const dx = (Math.random() - 0.5) * this.shakeStrength;
            const dy = (Math.random() - 0.5) * this.shakeStrength;
            this.ctx.save();
            this.ctx.translate(dx, dy);
            this.shakeStrength *= RenderConfig.camera.shakeDecay;
        } else {
            this.shakeStrength = 0;
        }
    }

    endFrame() {
        if (this.shakeStrength > 0) {
            this.ctx.restore();
        }
    }

    triggerShake(amount) {
        this.shakeStrength = Math.min(this.shakeStrength + amount, RenderConfig.camera.shakeMax);
    }
}

/* ==========================================================================
   3. PARTICLE SYSTEM (VISUAL EFFECTS)
   ========================================================================== */

const ParticleType = {
    SPARK: 0,   // Искры при ударе о колышек
    TRAIL: 1,   // Шлейф за шариком
    GLOW: 2,    // Статичное свечение
    TEXT: 3,    // Всплывающий текст (x10, x100)
    CONFETTI: 4 // При большом выигрыше
};

class Particle {
    constructor() {
        this.active = false;
        this.pos = new MathConfig.Vector(0, 0);
        this.vel = new MathConfig.Vector(0, 0);
        this.life = 0;
        this.maxLife = 0;
        this.size = 0;
        this.color = '#fff';
        this.type = ParticleType.SPARK;
        this.text = '';
    }

    spawn(x, y, type, options = {}) {
        this.active = true;
        this.pos.set(x, y);
        this.type = type;
        
        switch (type) {
            case ParticleType.SPARK:
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                this.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
                this.life = Math.random() * 20 + 10;
                this.maxLife = this.life;
                this.size = Math.random() * 2 + 1;
                this.color = options.color || '#fff';
                break;
                
            case ParticleType.TRAIL:
                this.vel.set(0, 0); // Трейл стоит на месте и исчезает
                this.life = 20;
                this.maxLife = 20;
                this.size = options.size || 4;
                this.color = options.color || RenderConfig.colors.trail;
                break;

            case ParticleType.TEXT:
                this.vel.set(0, -1); // Всплывает вверх
                this.life = 60;
                this.maxLife = 60;
                this.size = 14;
                this.color = options.color || '#fff';
                this.text = options.text || '';
                break;
        }
    }

    update() {
        if (!this.active) return;

        this.life--;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.pos.add(this.vel);

        // Физика частиц
        if (this.type === ParticleType.SPARK) {
            this.vel.y += 0.1; // Гравитация для искр
            this.vel.mult(0.95); // Трение
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        const alpha = this.life / this.maxLife;

        ctx.globalAlpha = alpha;

        if (this.type === ParticleType.TEXT) {
            ctx.font = `bold ${this.size}px Arial`;
            ctx.fillStyle = this.color;
            ctx.fillText(this.text, this.pos.x, this.pos.y);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() {
        this.pool = [];
        this.limit = RenderConfig.particles.maxCount;
        
        // Создаем пул объектов, чтобы не нагружать Garbage Collector
        for (let i = 0; i < this.limit; i++) {
            this.pool.push(new Particle());
        }
    }

    spawn(x, y, type, options) {
        // Ищем первую свободную частицу
        const p = this.pool.find(p => !p.active);
        if (p) {
            p.spawn(x, y, type, options);
        }
    }

    spawnBurst(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.spawn(x, y, ParticleType.SPARK, { color });
        }
    }

    spawnText(x, y, text, color) {
        this.spawn(x, y, ParticleType.TEXT, { text, color });
    }

    update() {
        this.pool.forEach(p => p.update());
    }

    draw(ctx) {
        // Оптимизация: меняем globalCompositeOperation для эффекта свечения
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Для красивого наложения
        this.pool.forEach(p => p.draw(ctx));
        ctx.restore();
    }
}

/* ==========================================================================
   4. GAME ENTITIES (PEG, BALL, BUCKET)
   ========================================================================== */

/**
 * Колышек (Obstacle)
 */
class Peg {
    constructor(x, y, r) {
        this.pos = new MathConfig.Vector(x, y);
        this.radius = r;
        this.activeAnim = 0; // Таймер анимации удара
    }

    hit() {
        this.activeAnim = 1.0; // 1.0 = 100% intensity
    }

    update() {
        if (this.activeAnim > 0) {
            this.activeAnim -= 0.05;
            if (this.activeAnim < 0) this.activeAnim = 0;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        
        // Если активен - рисуем ярче и больше
        if (this.activeAnim > 0) {
            const glowSize = this.radius + (this.activeAnim * 4);
            const alpha = this.activeAnim;
            
            // Glow effect
            const gradient = ctx.createRadialGradient(this.pos.x, this.pos.y, this.radius, this.pos.x, this.pos.y, glowSize);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(1, `rgba(108, 93, 211, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.arc(this.pos.x, this.pos.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Idle state
            ctx.fillStyle = RenderConfig.colors.pegIdle;
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Игровой шарик
 */
class Ball {
    constructor(id, bet) {
        this.id = id;
        this.bet = bet;
        
        this.pos = new MathConfig.Vector(0, 0); // Устанавливается при спавне
        this.oldPos = new MathConfig.Vector(0, 0); // Для Verlet интеграции
        this.vel = new MathConfig.Vector(0, 0);
        this.acc = new MathConfig.Vector(0, 0);
        
        this.radius = MathConfig.ballRadius;
        this.active = true;
        this.trailTimer = 0;
        
        // Для Provably Fair режима (если нужно примагнитить к пути)
        this.targetPath = null; 
        this.pathIndex = 0;
    }

    setPath(pathData) {
        // pathData - это массив 0/1 (лево/право)
        // В рамках "честной физики" мы не используем это для телепортации,
        // но можем использовать для микро-коррекций (nudge), если хотим гарантии.
        // В этой реализации мы делаем ставку на честную физику.
        this.targetPath = pathData;
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update(dt) {
        if (!this.active) return;

        // --- Интеграция Верле (Velocity Verlet) ---
        // Это более стабильно чем Euler
        
        // 1. Применяем гравитацию
        this.acc.y += MathConfig.gravity;

        // 2. Обновляем позицию
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        
        // 3. Трение воздуха (Friction)
        this.vel.mult(MathConfig.friction);

        // 4. Сброс ускорения
        this.acc.set(0, 0);

        // --- Логика трейла ---
        this.trailTimer++;
        if (this.trailTimer % 3 === 0) {
            GameLogic.particles.spawn(this.pos.x, this.pos.y, ParticleType.TRAIL, {
                size: this.radius * 0.8
            });
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.shadowBlur = 15;
        ctx.shadowColor = RenderConfig.colors.ballGlow;
        ctx.fillStyle = RenderConfig.colors.ball;
        
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Блик
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.pos.x - 2, this.pos.y - 2, this.radius / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Нижний слот (куда падает шарик)
 */
class Bucket {
    constructor(index, x, y, width, height, multiplier, risk) {
        this.index = index;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.multiplier = multiplier;
        
        // Определение цвета по множителю
        this.colorStart = '#444';
        this.colorEnd = '#222';
        this.determineColor(multiplier, risk);
        
        this.animScale = 1.0;
    }

    determineColor(m, risk) {
        let colors = RenderConfig.colors.multLow;
        if (m >= 3) colors = RenderConfig.colors.multMed;
        if (m >= 10) colors = RenderConfig.colors.multHigh;
        if (m >= 50) colors = RenderConfig.colors.multMega;
        
        this.colorStart = colors[0];
        this.colorEnd = colors[1];
    }

    triggerWin() {
        this.animScale = 1.3;
    }

    update() {
        if (this.animScale > 1.0) {
            this.animScale -= 0.02;
        } else {
            this.animScale = 1.0;
        }
    }

    draw(ctx) {
        // Рисуем блок. У нас он визуально выглядит как скругленный прямоугольник
        const w = this.width - 4; // Gap
        const h = this.height;
        const drawX = this.x + 2 - (w * (this.animScale - 1)) / 2;
        const drawY = this.y - (h * (this.animScale - 1)) / 2;
        const drawW = w * this.animScale;
        const drawH = h * this.animScale;

        // Градиент
        const grad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
        grad.addColorStop(0, this.colorStart);
        grad.addColorStop(1, this.colorEnd);

        ctx.fillStyle = grad;
        
        // Скругленный прямоугольник (функция canvas API)
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, drawW, drawH, 4);
        ctx.fill();
        
        // Текст множителя
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Inter, sans-serif';
        if (this.animScale > 1.1) ctx.font = 'bold 12px Inter, sans-serif';
        
        const text = `${this.multiplier}x`;
        ctx.fillText(text, this.x + this.width / 2, this.y + this.height / 2 + 1);
        
        // Тень (свечение при выигрыше)
        if (this.animScale > 1.0) {
            ctx.shadowColor = this.colorStart;
            ctx.shadowBlur = 10;
            ctx.stroke(); // Обводка свечением
            ctx.shadowBlur = 0;
        }
    }
}

/* ==========================================================================
   5. PHYSICS ENGINE (COLLISIONS & RESOLUTION)
   ========================================================================== */

const Physics = {
    /**
     * Проверка столкновения круга с кругом (Шарик vs Колышек)
     */
    checkCircleCollision(ball, peg) {
        const distSq = MathConfig.Utils.distSq(ball.pos.x, ball.pos.y, peg.pos.x, peg.pos.y);
        const minDist = ball.radius + peg.radius;
        
        if (distSq < minDist * minDist) {
            Physics.resolveCollision(ball, peg, Math.sqrt(distSq), minDist);
            return true;
        }
        return false;
    },

    /**
     * Реакция на столкновение
     */
    resolveCollision(ball, peg, dist, minDist) {
        // Вектор нормали столкновения
        const nx = (ball.pos.x - peg.pos.x) / dist;
        const ny = (ball.pos.y - peg.pos.y) / dist;

        // 1. Выталкивание (Position Correction)
        // Чтобы шарик не застревал внутри колышка
        const overlap = minDist - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;

        // 2. Отскок (Velocity Reflection)
        // v' = v - 2 * (v . n) * n
        const dot = ball.vel.x * nx + ball.vel.y * ny;
        
        // Добавляем упругость (bounce)
        // Немного случайности в отскок, чтобы симуляция была живой
        const bounceRand = MathConfig.Utils.randomFloat(0.95, 1.05);
        const restitution = MathConfig.bounce * bounceRand;

        ball.vel.x = (ball.vel.x - 2 * dot * nx) * restitution;
        ball.vel.y = (ball.vel.y - 2 * dot * ny) * restitution;

        // Добавляем случайное боковое ускорение (Chaos factor)
        // Это важно для Плинко, иначе шарики будут падать слишком предсказуемо
        ball.vel.x += (Math.random() - 0.5) * 0.5;
    },

    /**
     * Проверка границ экрана (стенок)
     */
    checkWalls(ball, width, height) {
        // Левая стена
        if (ball.pos.x < ball.radius) {
            ball.pos.x = ball.radius;
            ball.vel.x *= -0.5;
        }
        // Правая стена
        if (ball.pos.x > width - ball.radius) {
            ball.pos.x = width - ball.radius;
            ball.vel.x *= -0.5;
        }
    }
};

/* ==========================================================================
   6. MAIN GAME CONTROLLER (LOGIC & LOOP)
   ========================================================================== */

const GameLogic = {
    renderer: null,
    particles: null,
    
    // Состояние
    isRunning: false,
    lastTime: 0,
    accumulator: 0,
    step: 1 / 60, // 60 FPS physics fixed step

    // Объекты
    pegs: [],
    balls: [],
    buckets: [],
    
    // Конфигурация текущей игры
    currentRowCount: 14,
    currentRisk: 'normal',
    pegGapX: 0,
    pegGapY: 0,
    
    init: () => {
        // Инициализация компонентов
        GameLogic.renderer = new RenderEngine('gameCanvas');
        GameLogic.particles = new ParticleSystem();
        
        // Загрузка конфига
        if (window.MathConfig) {
            GameLogic.currentRowCount = window.MathConfig.rows;
        }
        
        // Создание уровня
        GameLogic.createLevel();
        
        // Запуск цикла
        GameLogic.isRunning = true;
        GameLogic.loop(0);
        
        console.log('%c[GameLogic] Engine Initialized', 'color: lime');
    },

    /**
     * Перестройка уровня (пирамиды)
     */
    createLevel: () => {
        GameLogic.pegs = [];
        GameLogic.buckets = [];
        
        const rows = GameLogic.currentRowCount;
        const canvasW = GameLogic.renderer.width;
        const canvasH = GameLogic.renderer.height;
        
        // Вычисляем отступы
        // Пирамида должна занимать примерно 80% высоты
        const paddingTop = 40;
        const paddingBottom = 60; // Место для бакетов
        const availableHeight = canvasH - paddingTop - paddingBottom;
        
        const gapY = availableHeight / rows;
        // GapX делаем чуть шире для красоты
        const gapX = gapY * 1.0; 
        
        GameLogic.pegGapX = gapX;
        GameLogic.pegGapY = gapY;
        
        const pegRadius = Math.min(4, gapX / 6);
        MathConfig.pegRadius = pegRadius;

        // Генерация колышков
        for (let row = 0; row < rows; row++) {
            // Кол-во колышков в ряду: row + 3 (стандарт Plinko X)
            // Обычно ряд 0 имеет 3 колышка, ряд 1 - 4 и т.д.
            // Но классическая пирамида: ряд 0 -> 1 колышек? 
            // Plinko X имеет "срезанный верх". Начнем с 3 колышков.
            const cols = row + 3;
            
            for (let col = 0; col < cols; col++) {
                // Центрирование
                const rowWidth = (cols - 1) * gapX;
                const offsetX = (canvasW - rowWidth) / 2;
                
                const x = offsetX + col * gapX;
                const y = paddingTop + row * gapY;
                
                GameLogic.pegs.push(new Peg(x, y, pegRadius));
            }
        }

        // Генерация бакетов (корзин внизу)
        // Их количество = кол-во колышков в последнем ряду - 1 (между колышками)
        // В последнем ряду было (rows-1) + 3 колышков.
        // Значит бакетов: (rows-1) + 3 - 1 = rows + 1. 
        // Если rows=14, бакетов 15. Все сходится.
        
        const bucketCount = rows + 1;
        const lastRowY = paddingTop + (rows - 1) * gapY;
        const bucketY = lastRowY 
