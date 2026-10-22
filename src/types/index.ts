export const coreCategories = [
  'Seeds & Crop Inputs',
  'Livestock Supplies',
  'Stored Harvests',
  'Finished Goods',
  'Equipment & Tools',
] as const;

export type BuiltInCategory = (typeof coreCategories)[number];
export type Category = BuiltInCategory | (string & {});

export type InventorySection =
  | 'Farm Inputs & Supplies'
  | 'Harvested Crops & Produce'
  | 'Livestock Inventory'
  | 'Processed / Value-Added Goods'
  | 'Equipment & Tools Status';

export type ItemCondition = 'Good' | 'Damaged' | 'Needs repair' | 'Operational' | 'In repair' | 'Needs maintenance';

export interface Item {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: Category;
  section: InventorySection;
  quantity: number;
  unit: string;
  unitCost: number;
  marketPrice: number;
  lotCode: string;
  location: string;
  quality: string;
  condition: ItemCondition;
  reorderLevel: number;
  expirationDate?: string;
  detail?: string;
  updatedAt: string;
}

export interface Livestock {
  id: string;
  type: string;
  count: number;
  location: string;
  notes: string;
}

export interface Crop {
  id: string;
  name: string;
  variety: string;
  harvestDate: string;
  block: string;
  quantity: number;
  unit: string;
  grade: string;
  destination: string;
}

export interface Setting {
  key: string;
  value: string | number | boolean | string[];
}

export interface Activity {
  id: string;
  title: string;
  detail: string;
  kind: 'added' | 'harvested' | 'sold' | 'fed' | 'written off' | 'updated';
  timestamp: string;
}

export interface Alert {
  id: string;
  itemId: string;
  title: string;
  detail: string;
  kind: 'low-stock' | 'expiry';
  daysRemaining?: number;
}
