// ui.js - Управление интерфейсом

const UI = {
    balance: 20000.00,
    currentBet: 50.00,

    getBalance: () => UI.balance,
    getBetAmount: () => UI.currentBet,

    updateBalance: (amount) => {
        UI.balance = parseFloat(amount.toFixed(2));
        document.getElementById('balance').innerText = UI.balance.toFixed(2);
    },

    updateBetAmount: (amount) => {
        UI.currentBet = parseFloat(amount.toFixed(2));
        document.getElementById('current-bet').innerText = UI.currentBet.toFixed(2);
    },

    // Создание цветных блоков с множителями внизу
    initMultipliers: () => {
        const container = document.getElementById('multipliers-container');
        container.innerHTML = '';
        
        MathConfig.multipliers.forEach(m => {
            const div = document.createElement('div');
            div.className = 'mult-box';
            div.innerText = m + 'x';
            
            // Раскраска
            if (m < 1) div.classList.add('mult-med');
            else if (m > 9) div.classList.add('mult-high');
            else div.classList.add('mult-low');
            
            container.appendChild(div);
        });
    },

    showWinAnimation: (amount) => {
        console.log(`Выигрыш: ${amount.toFixed(2)}`);
        // Здесь можно добавить всплывающее окно
    }
};
