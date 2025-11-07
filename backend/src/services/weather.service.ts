import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface WeatherData {
  temperature: number; // в градусах Цельсия
  feelsLike: number;
  humidity: number; // процент влажности
  pressure: number; // в гПа
  visibility?: number | null; // в метрах (может быть null)
  windSpeed: number; // в м/с
  windGust?: number; // порывы ветра в м/с
  rain?: {
    '1h'?: number; // осадки за последний час в мм
  };
  snow?: {
    '1h'?: number; // снег за последний час в мм
  };
  weather: Array<{
    id: number;
    main: string; // Rain, Snow, Extreme, etc.
    description: string;
    icon: string;
  }>;
}

interface WeatherResponse {
  data: WeatherData;
  isBadWeather: boolean;
  reasons: string[];
  forecast?: {
    hoursAhead: number;
    willBeBad: boolean;
    forecastReasons: string[];
  };
}

interface ForecastData {
  dt: number; // timestamp
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
    gust?: number;
  };
  visibility?: number;
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
}

/**
 * Сезонные особенности климата Хабаровска:
 * 
 * ЗИМА (декабрь-февраль):
 * - Средние температуры: -15°C до -20°C
 * - Экстремальные морозы: до -30°C и ниже
 * - Малоснежно, но возможны метели
 * - Сильные ветры опасны при низких температурах
 * 
 * ВЕСНА (март-май):
 * - Переходный период: от -6°C (март) до +12°C (май)
 * - Высокий риск гололеда при температурах около 0°C
 * - Увеличение осадков в мае
 * - Перепады температур
 * 
 * ЛЕТО (июнь-август):
 * - Жарко: +18°C до +21°C
 * - Обильные осадки (муссонный период)
 * - Грозы и сильные дожди
 * - Высокая влажность
 * 
 * ОСЕНЬ (сентябрь-ноябрь):
 * - Переходный период: от +14°C (сентябрь) до -7°C (ноябрь)
 * - Первые заморозки в ноябре
 * - Риск гололеда при перепадах температур
 * - Уменьшение осадков
 */
class WeatherService {
  private client: AxiosInstance;
  private cache: Map<string, { data: WeatherResponse; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 минут кеш
  private readonly KHABAROVSK_LAT = 48.4827;
  private readonly KHABAROVSK_LON = 135.0838;

  constructor() {
    const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      logger.warn('⚠️ WEATHER_API_KEY не установлен, погодные условия будут отключены');
    }

    this.client = axios.create({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      timeout: 5000,
      params: {
        appid: apiKey,
        units: 'metric', // градусы Цельсия, метры, м/с
        lang: 'ru',
      },
    });

    // Логирование запросов
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Погодный API запрос: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Ошибка запроса к погодному API:', error);
        return Promise.reject(error);
      }
    );

    // Обработка ответов
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          logger.error('Ошибка погодного API:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else {
          logger.error('Ошибка сети при запросе к погодному API:', error.message);
        }
        // Не выбрасываем ошибку, возвращаем "хорошую погоду" по умолчанию
        return Promise.resolve({ data: null });
      }
    );
  }

  /**
   * Проверяет плохие погодные условия в Хабаровске
   * Использует текущую погоду и прогноз на ближайшие 6 часов (как Яндекс.Такси)
   */
  async checkBadWeather(): Promise<WeatherResponse> {
    const cacheKey = 'khabarovsk';
    const cached = this.cache.get(cacheKey);

    // Проверяем кеш
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug('Используем кешированные данные о погоде');
      return cached.data;
    }

    const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      // Если API ключ не установлен, возвращаем хорошую погоду
      return {
        data: null as any,
        isBadWeather: false,
        reasons: [],
      };
    }

    try {
      // Получаем текущую погоду и прогноз одновременно
      const [currentResponse, forecastResponse] = await Promise.all([
        this.client.get('/weather', {
          params: {
            lat: this.KHABAROVSK_LAT,
            lon: this.KHABAROVSK_LON,
          },
        }),
        this.client.get('/forecast', {
          params: {
            lat: this.KHABAROVSK_LAT,
            lon: this.KHABAROVSK_LON,
            cnt: 3, // Прогноз на 3 интервала (6 часов вперед)
          },
        }).catch(() => null), // Если прогноз недоступен, продолжаем с текущей погодой
      ]);

      const weatherData = currentResponse.data as WeatherData;
      const currentEvaluation = this.evaluateWeatherConditions(weatherData);

      // Анализируем прогноз на ближайшие 6 часов
      let forecastAnalysis: WeatherResponse['forecast'] | undefined;
      if (forecastResponse?.data?.list) {
        forecastAnalysis = this.analyzeForecast(forecastResponse.data.list as ForecastData[]);
      }

      // Если текущая погода плохая ИЛИ прогноз предсказывает плохую погоду - считаем плохой
      const isBadWeather = currentEvaluation.isBad || (forecastAnalysis?.willBeBad ?? false);
      const allReasons = [...currentEvaluation.reasons];
      
      if (forecastAnalysis?.willBeBad && forecastAnalysis.forecastReasons.length > 0) {
        allReasons.push(...forecastAnalysis.forecastReasons.map(r => `Прогноз: ${r}`));
      }

      const result: WeatherResponse = {
        data: weatherData,
        isBadWeather,
        reasons: allReasons,
        forecast: forecastAnalysis,
      };

      // Сохраняем в кеш
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      logger.info(`Погода в Хабаровске: ${isBadWeather ? 'ПЛОХАЯ' : 'хорошая'}`, {
        temperature: weatherData.temperature,
        conditions: weatherData.weather.map(w => w.description).join(', '),
        reasons: allReasons,
        forecastBad: forecastAnalysis?.willBeBad,
      });

      return result;
    } catch (error: any) {
      logger.error('Ошибка при получении погоды:', error);
      // В случае ошибки возвращаем хорошую погоду
      return {
        data: null as any,
        isBadWeather: false,
        reasons: [],
      };
    }
  }

  /**
   * Анализирует прогноз погоды на ближайшие 6 часов
   * (как Яндекс.Такси - учитывает прогноз, а не только текущую погоду)
   */
  private analyzeForecast(forecastList: ForecastData[]): WeatherResponse['forecast'] {
    const reasons: string[] = [];
    const now = Date.now();
    
    if (!forecastList || forecastList.length === 0) {
      return {
        hoursAhead: 0,
        willBeBad: false,
        forecastReasons: [],
      };
    }
    
    // Анализируем прогноз на ближайшие 6 часов (обычно 3 интервала по 2-3 часа)
    for (const forecast of forecastList) {
      const forecastTime = forecast.dt * 1000;
      const hoursAhead = Math.round((forecastTime - now) / (1000 * 60 * 60));
      
      // Пропускаем прогнозы более чем на 6 часов вперед или в прошлом
      if (hoursAhead > 6 || hoursAhead < 0) continue;

      // Проверяем прогноз по тем же критериям, что и текущую погоду
      const forecastData: WeatherData = {
        temperature: forecast.main.temp,
        feelsLike: forecast.main.feels_like,
        humidity: forecast.main.humidity,
        pressure: forecast.main.pressure,
        visibility: forecast.visibility ?? undefined,
        windSpeed: forecast.wind.speed,
        windGust: forecast.wind.gust,
        rain: forecast.rain,
        snow: forecast.snow,
        weather: forecast.weather.map(w => ({
          id: w.id,
          main: w.main,
          description: w.description,
          icon: '',
        })),
      };

      const evaluation = this.evaluateWeatherConditions(forecastData);
      
      if (evaluation.isBad) {
        // Добавляем причины с указанием времени прогноза
        const timeLabel = hoursAhead === 0 ? 'сейчас' : `через ${hoursAhead} ч`;
        evaluation.reasons.forEach(reason => {
          // Извлекаем основную причину (до двоеточия) для проверки дубликатов
          const mainReason = reason.split(':')[0];
          if (!reasons.some(r => r.includes(mainReason))) {
            reasons.push(`${reason} (${timeLabel})`);
          }
        });
      }
    }

    const hoursAheadList = forecastList
      .map(f => Math.round((f.dt * 1000 - Date.now()) / (1000 * 60 * 60)))
      .filter(h => h >= 0 && h <= 6);

    return {
      hoursAhead: hoursAheadList.length > 0 ? Math.min(...hoursAheadList) : 0,
      willBeBad: reasons.length > 0,
      forecastReasons: reasons,
    };
  }

  /**
   * Определяет текущий сезон для Хабаровска
   */
  private getSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month === 12 || month === 1 || month === 2) {
      return 'winter';
    } else if (month >= 3 && month <= 5) {
      return 'spring';
    } else if (month >= 6 && month <= 8) {
      return 'summer';
    } else {
      return 'autumn';
    }
  }

  /**
   * Оценивает погодные условия и определяет, являются ли они плохими
   * с учетом сезонных особенностей климата Хабаровска
   */
  private evaluateWeatherConditions(data: WeatherData): { isBad: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const season = this.getSeason();
    const temp = data.temperature;
    const feelsLike = data.feelsLike || temp;
    const weatherId = data.weather[0]?.id || 0;
    const weatherDesc = data.weather[0]?.description || '';

    // Сезонные пороги для определения плохой погоды
    const thresholds: Record<string, {
      extremeCold?: number;
      dangerousCold?: number;
      extremeHeat?: number;
      windThreshold: number;
      snowHeavy?: number;
      rainHeavy?: number;
      rainModerate?: number;
      visibility: number;
      humidityHigh?: number;
      iceRisk?: { min: number; max: number };
    }> = {
      winter: {
        extremeCold: -25,      // Экстремальный холод (ниже среднего -20°C)
        dangerousCold: -20,    // Опасный холод
        windThreshold: 12,     // Сильный ветер опаснее при низких температурах
        snowHeavy: 1.5,        // Сильный снегопад (зима малоснежная, но метели опасны)
        visibility: 300,       // Плохая видимость при метелях
      },
      spring: {
        extremeCold: -10,      // Необычно холодно для весны
        dangerousCold: -5,
        windThreshold: 15,
        rainHeavy: 4,          // Сильный дождь в мае
        iceRisk: { min: -3, max: 3 }, // Риск гололеда
        visibility: 500,
      },
      summer: {
        extremeHeat: 30,       // Экстремальная жара
        rainHeavy: 5,         // Обильные муссонные дожди
        rainModerate: 3,       // Умеренный дождь может быть проблемой
        windThreshold: 15,
        humidityHigh: 85,     // Высокая влажность
        visibility: 500,
      },
      autumn: {
        extremeCold: -10,      // Ранние заморозки
        dangerousCold: -5,
        windThreshold: 15,
        rainHeavy: 4,
        iceRisk: { min: -3, max: 3 }, // Риск гололеда
        snowHeavy: 1.5,        // Первый снег в ноябре
        visibility: 500,
      },
    };

    const threshold = thresholds[season];

    // 1. ПРОВЕРКА ТЕМПЕРАТУРЫ (сезонно-зависимая)
    if (season === 'winter') {
      // Зима: экстремальный холод опасен для доставки
      if (threshold.extremeCold && temp < threshold.extremeCold) {
        reasons.push(`Экстремальный мороз: ${Math.round(temp)}°C`);
      } else if (threshold.dangerousCold && temp < threshold.dangerousCold && data.windSpeed > threshold.windThreshold) {
        reasons.push(`Сильный мороз с ветром: ${Math.round(temp)}°C, ветер ${Math.round(data.windSpeed)} м/с`);
      } else if (threshold.dangerousCold && temp < threshold.dangerousCold) {
        reasons.push(`Сильный мороз: ${Math.round(temp)}°C`);
      }
    } else if (season === 'summer') {
      // Лето: экстремальная жара может быть проблемой
      if (threshold.extremeHeat && threshold.humidityHigh && temp > threshold.extremeHeat && data.humidity > threshold.humidityHigh) {
        reasons.push(`Экстремальная жара с высокой влажностью: ${Math.round(temp)}°C`);
      }
    } else {
      // Весна/Осень: необычно холодно для сезона
      if (threshold.extremeCold && temp < threshold.extremeCold) {
        reasons.push(`Необычно холодно для ${season === 'spring' ? 'весны' : 'осени'}: ${Math.round(temp)}°C`);
      }
    }

    // 2. ПРОВЕРКА ОСАДКОВ (сезонно-зависимая)
    if (data.rain) {
      const rain1h = data.rain['1h'] || 0;
      
      if (season === 'summer') {
        // Лето: муссонные дожди - основная проблема
        if (threshold.rainHeavy && rain1h > threshold.rainHeavy) {
          reasons.push(`Сильный муссонный дождь: ${rain1h.toFixed(1)} мм/ч`);
        } else if (threshold.rainModerate && rain1h > threshold.rainModerate && weatherId >= 520) {
          reasons.push(`Умеренный дождь: ${rain1h.toFixed(1)} мм/ч`);
        }
      } else if (season === 'spring' || season === 'autumn') {
        // Весна/Осень: сильные дожди опасны
        if (threshold.rainHeavy && rain1h > threshold.rainHeavy) {
          reasons.push(`Сильный дождь: ${rain1h.toFixed(1)} мм/ч`);
        }
      } else {
        // Зима: дождь зимой - редкое и опасное явление
        if (rain1h > 2) {
          reasons.push(`Аномальный зимний дождь: ${rain1h.toFixed(1)} мм/ч`);
        }
      }
    }

    if (data.snow) {
      const snow1h = data.snow['1h'] || 0;
      
      if (season === 'winter') {
        // Зима: метели опасны даже при небольшом количестве снега
        if (threshold.snowHeavy && snow1h > threshold.snowHeavy) {
          reasons.push(`Сильный снегопад: ${snow1h.toFixed(1)} мм/ч`);
        } else if (snow1h > 0.5 && data.windSpeed > threshold.windThreshold) {
          reasons.push(`Метель: снег ${snow1h.toFixed(1)} мм/ч, ветер ${Math.round(data.windSpeed)} м/с`);
        }
      } else if (season === 'autumn') {
        // Осень: первый снег в ноябре может быть проблемой
        if (threshold.snowHeavy && snow1h > threshold.snowHeavy) {
          reasons.push(`Сильный снегопад: ${snow1h.toFixed(1)} мм/ч`);
        }
      } else {
        // Весна/Лето: снег - аномальное явление
        if (snow1h > 0.5) {
          reasons.push(`Аномальный снег для ${season === 'spring' ? 'весны' : 'лета'}: ${snow1h.toFixed(1)} мм/ч`);
        }
      }
    }

    // 3. ПРОВЕРКА ПОГОДНЫХ ЯВЛЕНИЙ
    // Гроза - всегда опасна
    if (weatherId >= 200 && weatherId <= 232) {
      reasons.push('Гроза');
    }

    // Гололед (код 511)
    if (weatherId === 511) {
      reasons.push('Гололед');
    }

    // Сильный дождь по кодам
    if (weatherId >= 520 && weatherId <= 531) {
      if (season === 'summer') {
        reasons.push('Сильный муссонный дождь');
      } else {
        reasons.push('Сильный дождь');
      }
    }

    // Сильный снег (код 602)
    if (weatherId === 602) {
      reasons.push('Сильный снегопад');
    }

    // Туман и плохая видимость
    if (weatherId >= 701 && weatherId <= 781) {
      if (weatherDesc.includes('туман') || weatherDesc.includes('fog') || weatherDesc.includes('mist')) {
        const visibilityThreshold = threshold.visibility || 500;
        if (!data.visibility || data.visibility < visibilityThreshold) {
          reasons.push(`Плохая видимость из-за тумана: ${data.visibility ? `${data.visibility} м` : 'очень низкая'}`);
        }
      }
    }

    // 4. ПРОВЕРКА ВЕТРА (сезонно-зависимая)
    if (season === 'winter') {
      // Зима: ветер опаснее при низких температурах
      if (data.windSpeed > threshold.windThreshold && temp < -15) {
        reasons.push(`Сильный ветер при морозе: ${Math.round(data.windSpeed)} м/с, ${Math.round(temp)}°C`);
      } else if (data.windSpeed > 18) {
        reasons.push(`Сильный ветер: ${Math.round(data.windSpeed)} м/с`);
      }
    } else {
      if (data.windSpeed > threshold.windThreshold) {
        reasons.push(`Сильный ветер: ${Math.round(data.windSpeed)} м/с`);
      }
    }

    // Порывы ветра
    if (data.windGust && data.windGust > 20) {
      reasons.push(`Шквалистый ветер: порывы до ${Math.round(data.windGust)} м/с`);
    }

    // 5. ПРОВЕРКА ВИДИМОСТИ
    if (data.visibility) {
      const visibilityThreshold = threshold.visibility || 500;
      if (data.visibility < visibilityThreshold) {
        reasons.push(`Плохая видимость: ${data.visibility} м`);
      }
    }

    // 6. ПРОВЕРКА ГОЛОЛЕДА (особенно актуально для весны и осени)
    if (season === 'spring' || season === 'autumn') {
      if (threshold.iceRisk && temp >= threshold.iceRisk.min && temp <= threshold.iceRisk.max) {
        if (data.rain || data.snow || weatherId === 511 || feelsLike < 0) {
          reasons.push(`Опасность гололеда: температура ${Math.round(temp)}°C с осадками`);
        }
      }
    } else if (season === 'winter') {
      // Зима: гололед при перепадах температур
      if (temp >= -5 && temp <= 2 && (data.rain || weatherId === 511)) {
        reasons.push('Опасность гололеда при оттепели');
      }
    }

    // 7. КОМБИНИРОВАННЫЕ УСЛОВИЯ
    // Сильный ветер + осадки = особенно опасно
    if (data.windSpeed > threshold.windThreshold && (data.rain || data.snow)) {
      const precipType = data.rain ? 'дождь' : 'снег';
      reasons.push(`Сильный ветер с ${precipType === 'дождь' ? 'дождем' : 'снегом'}`);
    }

    const isBad = reasons.length > 0;

    return { isBad, reasons };
  }

  /**
   * Очистить кеш
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const weatherService = new WeatherService();

