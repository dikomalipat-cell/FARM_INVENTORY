import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, EmptyState, FilterChips, FormModal, ItemCard, SearchBar, SectionHeader } from '@/components/farm-ui';
import { theme } from '@/constants/theme';
import { useInventory } from '@/context/inventory-context';
import { coreCategories, type BuiltInCategory, type InventorySection, type Item, type ItemCondition } from '@/types';
import { formatCurrency, getCategoryThresholds, isLowStock } from '@/utils/inventory';

const conditionOptions: ItemCondition[] = ['Good', 'Damaged', 'Needs repair', 'Operational', 'In repair', 'Needs maintenance'];
const sectionForCategory: Record<BuiltInCategory, InventorySection> = {
  'Seeds & Crop Inputs': 'Farm Inputs & Supplies',
  'Livestock Supplies': 'Farm Inputs & Supplies',
  'Stored Harvests': 'Harvested Crops & Produce',
  'Finished Goods': 'Processed / Value-Added Goods',
  'Equipment & Tools': 'Equipment & Tools Status',
};
const inputFields = [
  { key: 'name', label: 'Item name', required: true },
  { key: 'sku', label: 'SKU / barcode', required: true },
  { key: 'description', label: 'Short description', required: true },
  { key: 'category', label: 'Category' },
  { key: 'quantity', label: 'Current quantity', required: true, keyboardType: 'decimal-pad' as const },
  { key: 'unit', label: 'Unit (kg, bags, units...)', required: true },
  { key: 'unitCost', label: 'Unit cost ($)', keyboardType: 'decimal-pad' as const },
  { key: 'marketPrice', label: 'Market price ($)', keyboardType: 'decimal-pad' as const },
  { key: 'reorderLevel', label: 'Reorder threshold', keyboardType: 'decimal-pad' as const },
  { key: 'lotCode', label: 'Lot / batch code', required: true },
  { key: 'location', label: 'Storage location', required: true },
  { key: 'quality', label: 'Quality grade' },
  { key: 'condition', label: 'Condition', options: conditionOptions },
  { key: 'expirationDate', label: 'Expiration date (YYYY-MM-DD)' },
];

function toValues(item: Item): Record<string, string> {
  return {
    name: item.name,
    sku: item.sku,
    description: item.description,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    unitCost: String(item.unitCost),
    marketPrice: String(item.marketPrice),
    reorderLevel: String(item.reorderLevel),
    lotCode: item.lotCode,
    location: item.location,
    quality: item.quality,
    condition: item.condition,
    expirationDate: item.expirationDate ?? '',
  };
}

export default function ListScreen() {
  const { items, settings, saveItem, isReady, storageError, updateError } = useInventory();
  const globalThreshold = Number(settings.globalThreshold) || 0;
  const currency = String(settings.currency ?? 'USD');
  const categoryThresholds = useMemo(() => getCategoryThresholds(settings), [settings]);
  const categoryOptions = Array.isArray(settings.categories) ? settings.categories : [...coreCategories];
  const filterOptions = ['All', ...categoryOptions, 'Low Stock'];
  const formFields = inputFields.map((field) => field.key === 'category' ? { ...field, options: categoryOptions } : field);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState<'Category' | 'Location' | 'Status'>('Category');
  const [editing, setEditing] = useState<Item | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sections = useMemo(() => {
    const filtered = items.filter((item) => {
      const textMatch = `${item.name} ${item.sku} ${item.description} ${item.location} ${item.lotCode}`.toLowerCase().includes(search.toLowerCase());
      const categoryMatch = filter === 'All' || (filter === 'Low Stock'
        ? isLowStock(item, globalThreshold, categoryThresholds)
        : item.category === filter);
      return textMatch && categoryMatch;
    });
    const sortKey = sort === 'Category' ? (item: Item) => item.category : sort === 'Location' ? (item: Item) => item.location : (item: Item) => isLowStock(item, globalThreshold, categoryThresholds) ? '0' : '1';
    filtered.sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.name.localeCompare(b.name));
    const groups = new Map<string, Item[]>();
    filtered.forEach((item) => groups.set(item.category, [...(groups.get(item.category) ?? []), item]));
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [items, search, filter, sort, globalThreshold, categoryThresholds]);

  const save = (values: Record<string, string>) => {
    const category = categoryOptions.includes(values.category) ? values.category : coreCategories[0];
    const quantity = Number(values.quantity);
    const unitCost = Number(values.unitCost);
    const marketPrice = Number(values.marketPrice);
    const reorderLevel = Number(values.reorderLevel);
    if (![quantity, unitCost, marketPrice, reorderLevel].every(Number.isFinite) || quantity < 0 || unitCost < 0 || marketPrice < 0 || reorderLevel < 0) return;
    const condition = conditionOptions.find((entry) => entry === values.condition) ?? editing?.condition ?? 'Good';
    saveItem({
      id: editing?.id ?? `item-${Date.now()}`,
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description.trim(),
      category,
      section: Object.entries(sectionForCategory).find(([key]) => key === category)?.[1] ?? 'Farm Inputs & Supplies',
      quantity,
      unit: values.unit.trim(),
      unitCost,
      marketPrice,
      reorderLevel,
      lotCode: values.lotCode.trim(),
      location: values.location.trim(),
      expirationDate: values.expirationDate.trim() || undefined,
      quality: values.quality?.trim() || editing?.quality || 'A',
      condition,
      detail: editing?.detail ?? '',
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(false);
    setEditing(null);
  };

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const lowCount = items.filter((item) => isLowStock(item, globalThreshold, categoryThresholds)).length;

  if (!isReady) return <View style={styles.loading}><AppText>Loading inventory...</AppText></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} globalThreshold={globalThreshold} categoryThresholds={categoryThresholds} currency={currency} onEdit={(selected) => { setEditing(selected); setModalOpen(true); }} />}
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} subtitle={`${section.data.length} items`} />}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <View><AppText size={25} weight="800">Inventory list</AppText><AppText size={12} color={theme.colors.muted} style={{ marginTop: 5 }}>Every item, right where you need it.</AppText></View>
              <View style={styles.headerIcon}><MaterialCommunityIcons name="format-list-bulleted" size={22} color={theme.colors.primary} /></View>
            </View>
            <View style={styles.summaryCard}>
              <View><AppText size={11} weight="600" color="#DBEBDD">TOTAL INVENTORY WORTH</AppText><AppText size={24} weight="800" color="#fff" style={{ marginTop: 5 }}>{formatCurrency(totalValue, currency)}</AppText></View>
              <View style={styles.lowStockBadge}><MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FFCA73" /><AppText size={12} weight="700" color="#fff">{lowCount} low stock</AppText></View>
            </View>
            {storageError || updateError ? <AppText size={12} color={theme.colors.danger} style={{ marginTop: 10 }}>{storageError ?? updateError}</AppText> : null}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, SKU, lot or location" />
            <FilterChips options={filterOptions} selected={filter} onSelect={setFilter} />
            <View style={styles.sortRow}>
              <AppText size={11} color={theme.colors.muted}>SORT BY</AppText>
              {(['Category', 'Location', 'Status'] as const).map((value) => (
                <Pressable key={value} onPress={() => setSort(value)} style={[styles.sortChip, sort === value && styles.sortActive]}>
                  <AppText size={11} weight="600" color={sort === value ? theme.colors.primary : theme.colors.muted}>{value}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No items found" detail="Try another search or add your first inventory item." />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
      <Pressable onPress={() => { setEditing(null); setModalOpen(true); }} style={styles.fab} accessibilityLabel="Add inventory item">
        <MaterialCommunityIcons name="plus" size={27} color="#fff" />
      </Pressable>
      <FormModal visible={modalOpen} title={editing ? 'Edit inventory item' : 'Add inventory item'} fields={formFields} initialValues={editing ? toValues(editing) : { category: categoryOptions[0] ?? coreCategories[0], quantity: '0', unitCost: '0', marketPrice: '0', reorderLevel: '0', condition: 'Good', quality: 'A' }} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={save} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerIcon: { height: 42, width: 42, borderRadius: 14, backgroundColor: theme.colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primary },
  lowStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 7 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: theme.colors.surface },
  sortActive: { backgroundColor: theme.colors.paleGreen },
  fab: { position: 'absolute', right: 23, bottom: 24, width: 56, height: 56, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#173719', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});
