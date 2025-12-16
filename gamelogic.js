// gamelogic.js - Физика и рендеринг

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Адаптация размера канваса
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;

let pegs = [];
let balls = [];

const GameLogic = {
    init: () => {
        GameLogic.createPegs();
        GameLogic.loop();
    },

    createPegs: () => {
        pegs = [];
        const rows = MathConfig.rows;
        const startY = 50;
        // Ширина основания пирамиды
        const maxCols = rows + 1; 
        const gap = canvas.width / (maxCols + 2);
        MathConfig.pegGap = gap;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= r; c++) {
                // Центрирование пирамиды
                const x = (canvas.width / 2) - (r * gap / 2) + (c * gap);
                const y = startY + r * gap;
                pegs.push({ x, y });
            }
        }
    },

    spawnBall: (betAmount) => {
        balls.push({
            x: canvas.width / 2 + Mathematics.random(-2, 2), // Чуть-чуть рандома на старте
            y: 10,
            vx: 0,
            vy: 0,
            radius: MathConfig.ballRadius,
            bet: betAmount,
            active: true
        });
    },

    update: () => {
        for (let i = balls.length - 1; i >= 0; i--) {
            let b = balls[i];
            
            // Гравитация
            b.vy += MathConfig.gravity;
            b.x += b.vx;
            b.y += b.vy;

            // Столкновение с колышками
            pegs.forEach(p => {
                const dx = b.x - p.x;
                const dy = b.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < b.radius + MathConfig.pegRadius) {
                    // Простой отскок: шарик всегда падает вниз, но меняет X
                    // Добавляем случайность влево или вправо
                    const direction = Math.random() > 0.5 ? 1 : -1;
                    b.vx = direction * Mathematics.random(1, 2); 
                    b.vy *= -0.5; // Замедляем падение при ударе
                    b.y -= 2; // Выталкиваем, чтобы не застрял
                }
            });

            // Проверка достижения дна (слотов)
            if (b.y > canvas.height - 50) {
                b.active = false;
                GameLogic.handleWin(b);
                balls.splice(i, 1);
            }
        }
    },

    handleWin: (ball) => {
        // Определяем, в какую ячейку упал
        // Считаем от центра
        const center = canvas.width / 2;
        const distFromCenter = ball.x - center;
        const slotWidth = MathConfig.pegGap;
        
        // Индекс смещения относительно центра
        let slotIndex = Math.floor(distFromCenter / slotWidth);
        
        // Приводим к индексу массива множителей
        // Середина массива
        const midArr = Math.floor(MathConfig.multipliers.length / 2);
        let finalIndex = midArr + slotIndex;

        const multiplier = Mathematics.getMultiplier(finalIndex);
        const winAmount = ball.bet * multiplier;

        UI.showWinAnimation(winAmount);
        UI.updateBalance(UI.getBalance() + winAmount);
    },

    draw: () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем колышки
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        pegs.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, MathConfig.pegRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Рисуем шарики
        balls.forEach(b => {
            ctx.beginPath();
            ctx.fillStyle = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    },

    loop: () => {
        GameLogic.update();
        GameLogic.draw();
        requestAnimationFrame(GameLogic.loop);
    }
};

// Инициализация при загрузке
window.onload = () => {
    GameLogic.init();
    UI.initMultipliers(); // Создаем HTML для нижних слотов
};
