// panel.js - Обработка кнопок панели управления

document.addEventListener('DOMContentLoaded', () => {
    
    const btnMinus = document.getElementById('btn-minus');
    const btnPlus = document.getElementById('btn-plus');
    const btnPlay = document.getElementById('btn-play');

    // Уменьшение ставки
    btnMinus.addEventListener('click', () => {
        let current = UI.getBetAmount();
        if (current > 10) {
            UI.updateBetAmount(current - 10);
        }
    });

    // Увеличение ставки
    btnPlus.addEventListener('click', () => {
        let current = UI.getBetAmount();
        if (current < 1000) {
            UI.updateBetAmount(current + 10);
        }
    });

    // Кнопка "Сделать ставку"
    btnPlay.addEventListener('click', () => {
        const bet = UI.getBetAmount();
        const balance = UI.getBalance();

        if (balance >= bet) {
            // Списываем деньги
            UI.updateBalance(balance - bet);
            
            // Запускаем логику игры (создаем шарик)
            GameLogic.spawnBall(bet);
        } else {
            alert("Недостаточно средств!");
        }
    });
});
