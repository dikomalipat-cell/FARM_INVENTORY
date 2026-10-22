import type { BuiltInCategory, Category, Item } from '@/types';

const categorySettingKeys: Record<BuiltInCategory, string> = {
  'Seeds & Crop Inputs': 'thresholdSeeds',
  'Livestock Supplies': 'thresholdLivestock',
  'Stored Harvests': 'thresholdHarvests',
  'Finished Goods': 'thresholdGoods',
  'Equipment & Tools': 'thresholdEquipment',
};

export function getCategoryThresholds(settings: Record<string, unknown>): Partial<Record<Category, number>> {
  const thresholds: Partial<Record<Category, number>> = {};
  for (const [category, key] of Object.entries(categorySettingKeys)) {
    const value = Number(settings[key]);
    if (Number.isFinite(value)) thresholds[category] = value;
  }
  return thresholds;
}

export function getReorderThreshold(
  item: Item,
  globalThreshold = 0,
  categoryThresholds: Partial<Record<Category, number>> = {},
): number {
  if (item.category === 'Equipment & Tools') return 0;
  return item.reorderLevel > 0 ? item.reorderLevel : categoryThresholds[item.category] ?? globalThreshold;
}

export function isLowStock(
  item: Item,
  globalThreshold = 0,
  categoryThresholds: Partial<Record<Category, number>> = {},
): boolean {
  const threshold = getReorderThreshold(item, globalThreshold, categoryThresholds);
  return threshold > 0 && item.quantity <= threshold;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
