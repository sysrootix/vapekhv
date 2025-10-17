// Типы для работы с API МойСклад

export interface MoySkladMeta {
  href: string;
  type: string;
  mediaType: string;
  uuidHref?: string;
  downloadHref?: string;
}

// Обертка для ссылок с мета-информацией
export interface MoySkladReference {
  meta: MoySkladMeta;
}

export interface MoySkladListResponse<T> {
  context: MoySkladMeta;
  meta: {
    href: string;
    type: string;
    mediaType: string;
    size: number;
    limit: number;
    offset: number;
  };
  rows: T[];
}

// Категория товаров (ProductFolder)
export interface MoySkladProductFolder {
  id: string;
  accountId: string;
  name: string;
  meta: MoySkladMeta;
  pathName?: string; // Полный путь категории
  description?: string;
  externalCode?: string;
  archived?: boolean;
  productFolder?: MoySkladReference; // Родительская категория
  image?: MoySkladReference;
  updated?: string;
}

// Изображение
export interface MoySkladImage {
  meta: MoySkladMeta;
  title?: string;
  filename?: string;
  size?: number;
  miniature?: MoySkladMeta;
  tiny?: MoySkladMeta;
}

// Цена продажи
export interface MoySkladSalePrice {
  value: number;
  currency: MoySkladMeta;
  priceType?: MoySkladMeta;
}

// Остатки
export interface MoySkladStock {
  stock?: number; // Остаток
  reserve?: number; // Резерв
  inTransit?: number; // В пути
  quantity?: number; // Доступно
}

// Характеристика модификации
export interface MoySkladCharacteristic {
  meta: MoySkladMeta;
  id: string;
  name: string;
  value: string;
}

// Товар (Product)
export interface MoySkladProduct {
  id: string;
  accountId: string;
  name: string;
  meta: MoySkladMeta;
  code?: string;
  externalCode?: string;
  article?: string;
  description?: string;
  archived?: boolean;
  pathName?: string;

  // Цены
  salePrices?: MoySkladSalePrice[];
  buyPrice?: { value: number; currency: MoySkladMeta };
  minPrice?: { value: number; currency: MoySkladMeta };

  // Изображения
  images?: MoySkladReference;

  // Категория
  productFolder?: MoySkladReference;

  // Остатки (только при использовании expand=stock)
  stock?: number;
  reserve?: number;
  inTransit?: number;
  quantity?: number;

  // Модификации
  modifications?: MoySkladReference;

  // Прочее
  weight?: number;
  volume?: number;
  barcodes?: Array<{ ean13?: string }>;

  updated?: string;
}

// Модификация (Variant)
export interface MoySkladVariant {
  id: string;
  accountId: string;
  name: string;
  meta: MoySkladMeta;
  code?: string;
  externalCode?: string;
  archived?: boolean;

  // Ссылка на товар
  product: MoySkladReference;

  // Характеристики модификации
  characteristics?: MoySkladCharacteristic[];

  // Цены
  salePrices?: MoySkladSalePrice[];
  buyPrice?: { value: number; currency: MoySkladMeta };
  minPrice?: { value: number; currency: MoySkladMeta };

  // Остатки
  stock?: number;
  reserve?: number;
  inTransit?: number;
  quantity?: number;

  // Изображения
  images?: MoySkladReference;

  // Прочее
  barcodes?: Array<{ ean13?: string }>;

  updated?: string;
}

// Ошибка API
export interface MoySkladError {
  errors: Array<{
    error: string;
    code?: number;
    moreInfo?: string;
    parameter?: string;
  }>;
}
