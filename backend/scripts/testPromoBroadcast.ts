import dotenv from 'dotenv';
import { sendPromoBroadcast } from '../src/services/bot.service';

// Загружаем переменные окружения
dotenv.config();

const TELEGRAM_ID = '1008837582';

async function testPromoBroadcast() {
  try {
    console.log(`📢 Отправка тестовой промо-рассылки на telegram_id: ${TELEGRAM_ID}`);
    
    await sendPromoBroadcast(BigInt(TELEGRAM_ID));
    
    console.log('✅ Промо-рассылка успешно отправлена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка отправки промо-рассылки:', error);
    process.exit(1);
  }
}

testPromoBroadcast();

