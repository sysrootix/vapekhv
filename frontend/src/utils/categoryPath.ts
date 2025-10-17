// Утилита для построения полного пути категории

interface CategoryWithParent {
  id: string;
  name: string;
  slug?: string;
  parent?: CategoryWithParent | null;
}

/**
 * Строит массив категорий от корневой до текущей
 * Например: [Вейпы, Многоразовые, XROS]
 */
export function buildCategoryPath(category: CategoryWithParent | null | undefined): CategoryWithParent[] {
  if (!category) return [];

  const path: CategoryWithParent[] = [];
  let current: CategoryWithParent | null | undefined = category;

  // Идем от текущей категории к корневой
  while (current) {
    path.unshift(current); // Добавляем в начало массива
    current = current.parent;
  }

  return path;
}

/**
 * Возвращает строку с полным путем категории
 * Например: "Вейпы > Многоразовые > XROS"
 */
export function getCategoryPathString(category: CategoryWithParent | null | undefined, separator: string = ' > '): string {
  const path = buildCategoryPath(category);
  return path.map(c => c.name).join(separator);
}
