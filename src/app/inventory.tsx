import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, FormModal, ItemCard, ScreenScroll } from '@/components/farm-ui';
import { theme } from '@/constants/theme';
import { useInventory } from '@/context/inventory-context';
import type { Category, InventorySection, Item, ItemCondition, Livestock } from '@/types';
import { getCategoryThresholds } from '@/utils/inventory';

const sectionDetails: { name: InventorySection; icon: 'seed' | 'barley' | 'cow' | 'food-apple' | 'tractor'; category: Category }[] = [
  { name: 'Farm Inputs & Supplies', icon: 'seed', category: 'Seeds & Crop Inputs' },
  { name: 'Harvested Crops & Produce', icon: 'barley', category: 'Stored Harvests' },
  { name: 'Livestock Inventory', icon: 'cow', category: 'Livestock Supplies' },
  { name: 'Processed / Value-Added Goods', icon: 'food-apple', category: 'Finished Goods' },
  { name: 'Equipment & Tools Status', icon: 'tractor', category: 'Equipment & Tools' },
];

const commonFields = [
  { key: 'name', label: 'Item or product name', required: true },
  { key: 'category', label: 'Category', options: ['Seeds & Crop Inputs', 'Livestock Supplies'] },
  { key: 'quantity', label: 'Quantity / count', required: true, keyboardType: 'decimal-pad' as const },
  { key: 'unit', label: 'Unit (kg, bags, head, units...)', required: true },
  { key: 'location', label: 'Location / field / pen', required: true },
  { key: 'detail', label: 'Variety, grade, packaging or condition' },
  { key: 'quality', label: 'Quality grade' },
  { key: 'condition', label: 'Condition / availability', options: ['Good', 'Damaged', 'Needs repair', 'Operational', 'In repair', 'Needs maintenance'] },
  { key: 'lotCode', label: 'Lot / batch / tag number' },
  { key: 'unitCost', label: 'Cost per unit ($)', keyboardType: 'decimal-pad' as const },
  { key: 'marketPrice', label: 'Sale / market price ($)', keyboardType: 'decimal-pad' as const },
  { key: 'reorderLevel', label: 'Reorder level', keyboardType: 'decimal-pad' as const },
  { key: 'expirationDate', label: 'Date (YYYY-MM-DD)' },
];
const conditionOptions: ItemCondition[] = ['Good', 'Damaged', 'Needs repair', 'Operational', 'In repair', 'Needs maintenance'];

function getItemValues(item: Item): Record<string, string> {
  return {
    name: item.name,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    location: item.location,
    detail: item.detail ?? item.description,
    quality: item.quality,
    condition: item.condition,
    lotCode: item.lotCode,
    unitCost: String(item.unitCost),
    marketPrice: String(item.marketPrice),
    reorderLevel: String(item.reorderLevel),
    expirationDate: item.expirationDate ?? '',
  };
}

function fieldsForSection(section: InventorySection | null) {
  if (section === 'Livestock Inventory') {
    return [
      { key: 'name', label: 'Animal class / type', required: true },
      { key: 'quantity', label: 'Head count', required: true, keyboardType: 'decimal-pad' as const },
      { key: 'unit', label: 'Unit', required: true },
      { key: 'location', label: 'Pen / pasture / barn', required: true },
      { key: 'detail', label: 'Health or herd notes' },
    ];
  }
  return commonFields.map((field) => {
    if (section === 'Farm Inputs & Supplies' && field.key === 'category') return field;
    if (section !== 'Farm Inputs & Supplies' && field.key === 'category') return { ...field, options: [sectionDetails.find((entry) => entry.name === section)?.category ?? 'Seeds & Crop Inputs'] };
    if (field.key === 'detail' && section === 'Harvested Crops & Produce') return { ...field, label: 'Variety, grade and destination' };
    if (field.key === 'location' && section === 'Harvested Crops & Produce') return { ...field, label: 'Source field / block' };
    if (field.key === 'expirationDate' && section === 'Harvested Crops & Produce') return { ...field, label: 'Harvest date (YYYY-MM-DD)' };
    if (field.key === 'detail' && section === 'Processed / Value-Added Goods') return { ...field, label: 'Packaging and product details' };
    if (field.key === 'detail' && section === 'Equipment & Tools Status') return { ...field, label: 'Availability / service notes' };
    if (field.key === 'expirationDate' && section === 'Equipment & Tools Status') return { ...field, label: 'Last service date (YYYY-MM-DD)' };
    return field;
  });
}

export default function InventoryScreen() {
  const { items, livestock, settings, saveItem, saveLivestock, isReady, storageError } = useInventory();
  const globalThreshold = Number(settings.globalThreshold) || 0;
  const currency = String(settings.currency ?? 'USD');
  const categoryThresholds = useMemo(() => getCategoryThresholds(settings), [settings]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(sectionDetails.map((section) => [section.name, true])),
  );
  const [activeSection, setActiveSection] = useState<InventorySection | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingLivestock, setEditingLivestock] = useState<Livestock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const beginAdd = (section: InventorySection) => {
    setActiveSection(section);
    setEditingItem(null);
    setEditingLivestock(null);
    setModalOpen(true);
  };

  const save = (values: Record<string, string>) => {
    const count = Number(values.quantity);
    if (!Number.isFinite(count) || count < 0) return;
    if (activeSection === 'Livestock Inventory') {
      saveLivestock({
        id: editingLivestock?.id ?? `herd-${Date.now()}`,
        type: values.name.trim(),
        count,
        location: values.location.trim(),
        notes: values.detail.trim(),
      });
    } else if (activeSection) {
      const category = activeSection === 'Farm Inputs & Supplies'
        ? values.category || editingItem?.category || 'Seeds & Crop Inputs'
        : editingItem?.category ?? sectionDetails.find((section) => section.name === activeSection)?.category ?? 'Seeds & Crop Inputs';
      const cost = Number(values.unitCost || 0);
      const market = Number(values.marketPrice || 0);
      const reorder = Number(values.reorderLevel || 0);
      if (![cost, market, reorder].every(Number.isFinite) || cost < 0 || market < 0 || reorder < 0) return;
      const condition = conditionOptions.find((entry) => entry === values.condition) ?? editingItem?.condition ?? 'Good';
      saveItem({
        id: editingItem?.id ?? `item-${Date.now()}`,
        name: values.name.trim(),
        sku: editingItem?.sku ?? `FARM-${Date.now().toString().slice(-6)}`,
        description: editingItem?.description ?? values.detail.trim(),
        category,
        section: activeSection,
        quantity: count,
        unit: values.unit.trim(),
        unitCost: cost,
        marketPrice: market,
        lotCode: values.lotCode.trim() || 'UNASSIGNED',
        location: values.location.trim(),
        quality: values.quality?.trim() || editingItem?.quality || 'Good',
        condition,
        reorderLevel: reorder,
        expirationDate: values.expirationDate.trim() || undefined,
        detail: values.detail.trim(),
        updatedAt: new Date().toISOString().slice(0, 10),
      });
    }
    setModalOpen(false);
  };

  if (!isReady) return <View style={styles.loading}><AppText>Loading farm inventory...</AppText></View>;

  return (
    <ScreenScroll contentStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View><AppText size={25} weight="800">Farm stock</AppText><AppText size={12} color={theme.colors.muted} style={{ marginTop: 5 }}>Your complete farm at a glance.</AppText></View>
        <View style={styles.headerIcon}><MaterialCommunityIcons name="warehouse" size={23} color={theme.colors.primary} /></View>
      </View>
      {storageError ? <View style={styles.error}><AppText size={12} color={theme.colors.danger}>{storageError}</AppText></View> : null}

      {sectionDetails.map((section) => {
        const sectionItems = items.filter((item) => item.section === section.name);
        const open = expanded[section.name] ?? false;
        const sectionTotal = section.name === 'Livestock Inventory'
          ? `${livestock.reduce((total, animal) => total + animal.count, 0).toLocaleString()} head`
          : [...sectionItems.reduce((totals, item) => totals.set(item.unit, (totals.get(item.unit) ?? 0) + item.quantity), new Map<string, number>())]
              .map(([unit, total]) => `${total.toLocaleString()} ${unit}`)
              .join(' · ') || '0 units';
        return (
          <View key={section.name} style={styles.section}>
            <View style={styles.sectionTop}>
              <Pressable onPress={() => setExpanded((current) => ({ ...current, [section.name]: !open }))} style={styles.sectionTitle}>
                <View style={styles.sectionIcon}><MaterialCommunityIcons name={section.icon} size={20} color={theme.colors.primary} /></View>
                <View style={{ flex: 1 }}><AppText size={14} weight="700">{section.name}</AppText><AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{sectionItems.length + (section.name === 'Livestock Inventory' ? livestock.length : 0)} records · {sectionTotal}</AppText></View>
                <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={21} color={theme.colors.muted} />
              </Pressable>
              <Pressable onPress={() => beginAdd(section.name)} style={styles.addButton}><MaterialCommunityIcons name="plus" size={17} color="#fff" /></Pressable>
            </View>
            {open ? (
              <View style={styles.sectionBody}>
                {section.name === 'Livestock Inventory'
                  ? livestock.map((animal) => (
                      <View key={animal.id} style={styles.livestockCard}>
                        <View style={styles.livestockIcon}><MaterialCommunityIcons name="cow" size={20} color={theme.colors.primary} /></View>
                        <View style={{ flex: 1 }}><AppText size={14} weight="700">{animal.type}</AppText><AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{animal.location} · {animal.notes}</AppText></View>
                        <AppText size={15} weight="800">{animal.count}</AppText>
                        <Pressable onPress={() => { setActiveSection(section.name); setEditingLivestock(animal); setEditingItem(null); setModalOpen(true); }} style={{ marginLeft: 8 }}><MaterialCommunityIcons name="pencil-outline" size={17} color={theme.colors.muted} /></Pressable>
                      </View>
                    ))
                  : sectionItems.map((item) => <ItemCard key={item.id} item={item} globalThreshold={globalThreshold} categoryThresholds={categoryThresholds} currency={currency} compact onEdit={(selected) => { setActiveSection(section.name); setEditingItem(selected); setEditingLivestock(null); setModalOpen(true); }} />)}
                {sectionItems.length === 0 && (section.name !== 'Livestock Inventory' || livestock.length === 0)
                  ? <EmptyState title="Nothing here yet" detail="Add the first record for this section." />
                  : null}
              </View>
            ) : null}
          </View>
        );
      })}
      <FormModal
        visible={modalOpen}
        title={editingItem || editingLivestock ? `Edit ${activeSection === 'Livestock Inventory' ? 'livestock' : 'record'}` : `Add ${activeSection ?? 'inventory'}`}
        fields={fieldsForSection(activeSection)}
        initialValues={editingItem ? getItemValues(editingItem) : editingLivestock ? {
          name: editingLivestock.type,
          quantity: String(editingLivestock.count),
          unit: 'head',
          location: editingLivestock.location,
          detail: editingLivestock.notes,
          lotCode: editingLivestock.id,
          condition: 'Good',
          quality: '',
        } : { quantity: '0', unit: activeSection === 'Livestock Inventory' ? 'head' : 'kg', unitCost: '0', marketPrice: '0', reorderLevel: '0' }}
        onClose={() => setModalOpen(false)}
        onSubmit={save}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  headerIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: theme.colors.paleGreen, justifyContent: 'center', alignItems: 'center' },
  error: { padding: 10, marginTop: 10, backgroundColor: theme.colors.paleRed, borderRadius: 12 },
  section: { marginTop: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, overflow: 'hidden' },
  sectionTop: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  sectionTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.paleGreen },
  addButton: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  sectionBody: { paddingHorizontal: 11, paddingBottom: 3, borderTopWidth: 1, borderTopColor: theme.colors.border },
  livestockCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 9 },
  livestockIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.paleGreen },
});
