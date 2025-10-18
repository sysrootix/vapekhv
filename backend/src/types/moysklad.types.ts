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

// Агент (Покупатель или наша организация)
export interface MoySkladAgent {
  meta: MoySkladMeta;
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
}

// Контрагент
export interface MoySkladCounterparty {
  id?: string;
  meta?: MoySkladMeta;
  name: string;
  phone?: string;
  email?: string;
  externalCode?: string;
  companyType?: string;
  actualAddress?: string;
}

export interface MoySkladCreateCounterpartyRequest {
  name: string;
  phone?: string;
  email?: string;
  externalCode?: string;
  companyType?: string;
  actualAddress?: string;
}

// Наша организация (для создания заказа)
export interface MoySkladOrganization {
  meta: MoySkladMeta;
  id?: string;
}

// Позиция заказа покупателя
export interface MoySkladCustomerOrderPosition {
  quantity: number;
  price: number; // Цена в копейках
  assortment: MoySkladReference; // Ссылка на товар или модификацию
  reserve?: number; // Резерв под позицию
}

// Заказ покупателя
export interface MoySkladCustomerOrder {
  id?: string;
  meta?: MoySkladMeta;
  name: string; // Номер заказа
  moment: string; // Дата и время заказа
  organization: MoySkladReference; // Наша организация
  agent: MoySkladAgent; // Покупатель
  store?: MoySkladReference; // Склад
  state?: MoySkladReference; // Статус заказа
  sum: number; // Сумма заказа в копейках
  description?: string; // Комментарий
  applicable?: boolean; // Проведен ли документ
  positions: MoySkladCustomerOrderPosition[];
  // Дополнительные поля для доставки
  deliveryPlannedMoment?: string; // Планируемая дата отгрузки
  // customFields?: { [key: string]: any }; // Пользовательские поля
  shipmentAddress?: string;
  vatEnabled?: boolean;
}

// Позиции для отгрузки (Demand)
export interface MoySkladDemandPosition {
  quantity: number;
  price: number;
  assortment: MoySkladReference;
  reserve?: number;
}

export interface MoySkladDemand {
  id?: string;
  meta?: MoySkladMeta;
  name?: string;
  moment?: string;
  organization: MoySkladReference;
  agent: MoySkladReference;
  store: MoySkladReference;
  applicable?: boolean;
  customerOrder?: MoySkladReference;
  description?: string;
  positions: MoySkladDemandPosition[];
}

export interface MoySkladLinkedOperation {
  meta: MoySkladMeta;
  linkedSum?: number;
}

export interface MoySkladCashIn {
  id?: string;
  meta?: MoySkladMeta;
  name?: string;
  moment?: string;
  organization: MoySkladReference;
  agent: MoySkladReference;
  sum: number;
  description?: string;
  operations?: MoySkladLinkedOperation[];
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
