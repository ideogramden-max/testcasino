// mathematics.js - Конфигурация и математика

const MathConfig = {
    rows: 14,             // Количество рядов
    pegRadius: 4,         // Радиус колышков
    ballRadius: 6,        // Радиус шарика
    gravity: 0.25,        // Сила тяжести
    bounce: 0.6,          // Отскок
    pegGap: 0,            // Рассчитывается динамически
    multipliers: []       // Массив значений множителей
};

// Генерация множителей (края - большие, центр - маленькие)
function generateMultipliers(rows) {
    const mults = [];
    const center = Math.floor(rows / 2);
    
    for(let i = 0; i <= rows; i++) {
        let dist = Math.abs(i - (rows / 2));
        // Простая формула для примера: чем дальше от центра, тем больше множитель
        let val = 0.2 + (dist * dist * 0.2); 
        
        // Округляем до красивых чисел как в оригинале
        if (val < 1) val = 0.5;
        else if (val < 3) val = Math.floor(val);
        else val = Math.floor(val * 2);
        
        mults.push(val);
    }
    // Хардкод для красоты как на скрине (примерный)
    // 15 слотов для 14 рядов
    return [100, 20, 10, 4, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 4, 10, 20, 100];
}

MathConfig.multipliers = generateMultipliers(MathConfig.rows);

const Mathematics = {
    // Случайное число
    random: (min, max) => Math.random() * (max - min) + min,
    
    // Получить множитель по индексу слота
    getMultiplier: (index) => {
        if(index < 0) index = 0;
        if(index >= MathConfig.multipliers.length) index = MathConfig.multipliers.length - 1;
        return MathConfig.multipliers[index];
    }
};
