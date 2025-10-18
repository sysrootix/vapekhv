import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { initBot, stopBot } from './services/bot.service';
import { initPaymentBot } from './services/payment-notification.service';
import { validateMoySkladConfig } from './config/moysklad';
import { schedulerService } from './services/scheduler.service';
import { syncService } from './services/sync.service';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import bonusRoutes from './routes/bonus.routes';
import orderRoutes from './routes/order.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (для работы за nginx)
app.set('trust proxy', 1);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP, попробуйте позже',
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compression
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Статические файлы (изображения товаров)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize Telegram bots
    initBot();
    initPaymentBot();

    // Validate MoySklad configuration
    let moySkladEnabled = false;
    try {
      validateMoySkladConfig();
      logger.info('✅ МойСклад конфигурация валидна');
      moySkladEnabled = true;
    } catch (error) {
      logger.warn('⚠️ МойСклад не настроен, синхронизация отключена');
      logger.warn('💡 Добавьте MOYSKLAD_TOKEN в .env для включения синхронизации');
    }

    // Start payment expiration checker (always enabled)
    schedulerService.startPaymentCheck();

    // Start sync scheduler and initial sync if MoySklad is enabled
    if (moySkladEnabled) {
      // Start sync scheduler
      schedulerService.start();

      // Initial sync on startup (non-blocking)
      logger.info('🔄 Запуск первоначальной синхронизации с МойСклад...');
      syncService.syncCatalog().catch((error) => {
        logger.error('Ошибка первоначальной синхронизации:', error);
      });
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📱 Domain: ${process.env.DOMAIN || 'localhost'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  schedulerService.stop();
  await stopBot();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  schedulerService.stop();
  await stopBot();
  process.exit(0);
});

startServer();

