#!/usr/bin/env node

/**
 * Генератор JWT секрета
 * Использование: node scripts/generate-jwt-secret.js
 */

const crypto = require('crypto');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

const secret = generateSecret();

console.log('🔐 Сгенерирован JWT секрет:\n');
console.log(secret);
console.log('\n📝 Добавьте его в backend/.env:');
console.log(`JWT_SECRET=${secret}`);
console.log('\n⚠️  ВАЖНО: Никогда не коммитьте этот секрет в Git!');

