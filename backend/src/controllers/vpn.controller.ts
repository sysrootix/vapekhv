import { Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../config/logger';

class VPNController {
  // Проверить страну пользователя по IP
  async checkCountry(req: Request, res: Response) {
    try {
      // Получаем IP пользователя из заголовков (через nginx proxy)
      const clientIp = 
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.ip ||
        req.socket.remoteAddress ||
        '';

      if (!clientIp) {
        return res.json({ 
          country: 'RU', 
          countryCode: 'RU',
          isVPN: false 
        });
      }

      // Используем ip-api.com через прокси бэкенда
      try {
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`, {
          params: {
            fields: 'status,country,countryCode',
          },
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
          timeout: 5000, // 5 секунд таймаут
        });

        const data = response.data;

        if (data.status === 'success') {
          const countryCode = data.countryCode?.toUpperCase() || 'RU';
          const allowedCountries = ['RU', 'BY', 'KZ', 'UA', 'AM', 'AZ', 'GE', 'KG', 'MD', 'TJ', 'TM', 'UZ'];
          const isVPN = !allowedCountries.includes(countryCode);

          return res.json({
            country: data.country,
            countryCode,
            isVPN,
          });
        } else {
          // В случае ошибки считаем что пользователь из России
          return res.json({
            country: 'Russia',
            countryCode: 'RU',
            isVPN: false,
          });
        }
      } catch (error) {
        logger.debug('VPN detection error:', error);
        // В случае ошибки считаем что пользователь из России
        return res.json({
          country: 'Russia',
          countryCode: 'RU',
          isVPN: false,
        });
      }
    } catch (error) {
      logger.error('Ошибка при проверке страны:', error);
      // В случае ошибки считаем что пользователь из России
      return res.json({
        country: 'Russia',
        countryCode: 'RU',
        isVPN: false,
      });
    }
  }
}

export default new VPNController();

