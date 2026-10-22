import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, LogoBadge, ScreenScroll, SectionHeader, StatCard, AlertBanner, ActivityFeedItem, FormModal, SearchBar, EmptyState } from '@/components/farm-ui';
import { theme } from '@/constants/theme';
import { useInventory } from '@/context/inventory-context';
import type { Alert, Item } from '@/types';
import { formatCurrency, getCategoryThresholds, getReorderThreshold } from '@/utils/inventory';

type QuickAction = 'harvest' | 'feed' | 'issue' | 'livestock';

function daysUntil(date?: string) {
  if (!date) return null;
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
}

function makeAlerts(items: Item[], globalThreshold: number, categoryThresholds: ReturnType<typeof getCategoryThresholds>): Alert[] {
  const lowStock = items
    .filter((item) => getReorderThreshold(item, globalThreshold, categoryThresholds) > 0 && item.quantity <= getReorderThreshold(item, globalThreshold, categoryThresholds))
    .map((item) => ({
      id: `low-${item.id}`,
      itemId: item.id,
      title: `${item.name} running low`,
      detail: `${item.quantity} ${item.unit} left · reorder at ${getReorderThreshold(item, globalThreshold, categoryThresholds)}`,
      kind: 'low-stock' as const,
    }));
  const expiries = items
    .map((item) => ({ item, days: daysUntil(item.expirationDate) }))
    .filter(({ days }) => days !== null && days <= 30)
    .map(({ item, days }) => ({
      id: `expiry-${item.id}`,
      itemId: item.id,
      title: `${item.name} ${days !== null && days < 0 ? 'is expired' : 'expires soon'}`,
      detail: `${item.location} · ${item.expirationDate}`,
      kind: 'expiry' as const,
      daysRemaining: days ?? 0,
    }));
  return [...lowStock, ...expiries];
}

const actions: { key: QuickAction; title: string; icon: 'barley' | 'cow' | 'package-variant' | 'paw'; tone: string }[] = [
  { key: 'harvest', title: 'Log harvest', icon: 'barley', tone: '#FFF3E0' },
  { key: 'feed', title: 'Record feed', icon: 'cow', tone: '#EAF4E6' },
  { key: 'issue', title: 'Issue input', icon: 'package-variant', tone: '#E8F0FE' },
  { key: 'livestock', title: 'Update herd', icon: 'paw', tone: '#FCE8E6' },
];

export default function HomeScreen() {
  const { items, livestock, activities, settings, changeQuantity, saveLivestock, isReady, storageError, updateError, clearUpdateError } = useInventory();
  const [action, setAction] = useState<QuickAction | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const globalThreshold = Number(settings.globalThreshold) || 0;
  const categoryThresholds = useMemo(() => getCategoryThresholds(settings), [settings]);
  const alerts = useMemo(() => makeAlerts(items, globalThreshold, categoryThresholds), [items, globalThreshold, categoryThresholds]);
  const totalHeads = livestock.reduce((total, animal) => total + animal.count, 0);
  const storedYield = items.filter((item) => item.section === 'Harvested Crops & Produce').reduce((total, item) => total + item.quantity, 0);
  const inputs = items.filter((item) => item.section === 'Farm Inputs & Supplies').reduce((total, item) => total + item.quantity, 0);
  const totalValue = items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
  const currency = String(settings.currency ?? 'USD');
  const matchingItems = items.filter((item) => `${item.name} ${item.sku} ${item.lotCode} ${item.location}`.toLowerCase().includes(search.toLowerCase()));
  const itemOptions = (section?: string) => items
    .filter((item) => !section || item.section === section)
    .map((item) => `${item.name} (${item.id})`);

  const submitAction = (values: Record<string, string>) => {
    if (action === 'livestock') {
      const herd = livestock[0];
      if (herd) {
        const count = Number(values.count);
        if (Number.isFinite(count) && count >= 0) saveLivestock({ ...herd, count });
      }
      setAction(null);
      return;
    }
    const selected = items.find((item) => values.item?.includes(`(${item.id})`));
    const quantity = Number(values.quantity);
    if (!selected || !Number.isFinite(quantity) || quantity <= 0) return;
    if (action === 'harvest') {
      changeQuantity(selected.id, quantity, 'harvested', `${selected.name} · ${quantity} ${selected.unit}`);
    } else {
      const kind = action === 'feed' ? 'fed' : 'written off';
      changeQuantity(selected.id, -quantity, kind, `${selected.name} · ${quantity} ${selected.unit}`);
    }
    setAction(null);
  };

  const formFields = action === 'livestock'
    ? [{ key: 'count', label: 'New herd count', required: true, keyboardType: 'numeric' as const }]
    : [
        { key: 'item', label: 'Inventory item', required: true, options: action === 'feed' ? items.filter((item) => item.category === 'Livestock Supplies' && item.name.toLowerCase().includes('feed')).map((item) => `${item.name} (${item.id})`) : itemOptions(action === 'harvest' ? 'Harvested Crops & Produce' : 'Farm Inputs & Supplies') },
        { key: 'quantity', label: 'Quantity', required: true, keyboardType: 'decimal-pad' as const },
      ];

  if (!isReady) return <View style={styles.loading}><AppText size={13}>Loading your farm...</AppText></View>;

  return (
    <ScreenScroll>
      <View style={styles.header}>
        <View style={styles.brand}>
          <LogoBadge />
          <View><AppText size={19} weight="800">Farm Inventory</AppText><AppText size={11} color={theme.colors.muted}>GOOD MORNING, FARMER</AppText></View>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.notificationButton} accessibilityLabel="Open settings">
          <MaterialCommunityIcons name="bell-outline" size={22} color={theme.colors.text} />
          {alerts.length > 0 ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.welcome}>
        <View>
          <AppText size={24} weight="800">Your farm, in focus.</AppText>
          <AppText size={13} color={theme.colors.muted} style={{ marginTop: 5 }}>Here&apos;s what&apos;s happening today.</AppText>
        </View>
        <View style={styles.weatherBadge}><MaterialCommunityIcons name="weather-partly-cloudy" size={20} color={theme.colors.accent} /><AppText size={13} weight="700">21°</AppText></View>
      </View>

      {storageError ? <View style={styles.errorBanner}><AppText size={12} color={theme.colors.danger}>{storageError}</AppText></View> : null}
      {updateError ? <Pressable onPress={clearUpdateError} style={styles.errorBanner}><AppText size={12} color={theme.colors.danger}>{updateError}  ·  Dismiss</AppText></Pressable> : null}

      <View style={styles.statGrid}>
        <StatCard label="Livestock" value={`${totalHeads}`} detail={`${livestock.length} herds & flocks`} icon="cow" onPress={() => router.push('/inventory')} />
        <StatCard label="Harvest in store" value={`${storedYield.toLocaleString()} kg`} detail="Across all harvest lots" icon="barley" tint="#FFF3E0" onPress={() => router.push('/list')} />
        <StatCard label="Farm inputs" value={`${inputs}`} detail="Units on hand" icon="seed" tint="#E8F0FE" onPress={() => router.push('/list')} />
        <StatCard label="Inventory value" value={formatCurrency(totalValue, currency)} detail="At average cost" icon="cash-multiple" tint="#F3E8FA" onPress={() => router.push('/list')} />
      </View>

      <SectionHeader title="Quick actions" subtitle="Keep your records up to date" />
      <View style={styles.actionGrid}>
        {actions.map((entry) => (
          <Pressable key={entry.key} onPress={() => setAction(entry.key)} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75 }]}>
            <View style={[styles.actionIcon, { backgroundColor: entry.tone }]}><MaterialCommunityIcons name={entry.icon} size={22} color={theme.colors.primary} /></View>
            <AppText size={12} weight="700">{entry.title}</AppText>
            <MaterialCommunityIcons name="arrow-top-right" size={16} color={theme.colors.muted} style={{ position: 'absolute', right: 12, top: 12 }} />
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Needs your attention" subtitle={`${alerts.length} active alerts`} action={<Pressable onPress={() => router.push('/list')}><AppText size={12} weight="700" color={theme.colors.primary}>View all</AppText></Pressable>} />
      <View style={styles.panel}>
        {alerts.length ? alerts.slice(0, 4).map((alert) => <AlertBanner key={alert.id} alert={alert} onPress={() => router.push('/list')} />) : <EmptyState title="All caught up" detail="No stock or expiry alerts right now." />}
      </View>

      <SectionHeader title="Field conditions" subtitle="North field · Updated 8:00 AM" />
      <View style={styles.conditions}>
        <View style={styles.condition}><MaterialCommunityIcons name="water-percent" size={20} color="#4084B8" /><AppText size={11} color={theme.colors.muted}>Humidity</AppText><AppText size={15} weight="700">64%</AppText></View>
        <View style={styles.conditionDivider} />
        <View style={styles.condition}><MaterialCommunityIcons name="sprout" size={20} color={theme.colors.primary} /><AppText size={11} color={theme.colors.muted}>Soil moisture</AppText><AppText size={15} weight="700">Good</AppText></View>
        <View style={styles.conditionDivider} />
        <View style={styles.condition}><MaterialCommunityIcons name="water-outline" size={20} color="#4084B8" /><AppText size={11} color={theme.colors.muted}>Irrigation</AppText><AppText size={15} weight="700">In 2 days</AppText></View>
      </View>

      <SectionHeader title="Recent activity" action={<Pressable onPress={() => router.push('/list')}><AppText size={12} weight="700" color={theme.colors.primary}>See all</AppText></Pressable>} />
      <View style={styles.panel}>
        {activities.slice(0, 4).map((activity) => <ActivityFeedItem key={activity.id} activity={activity} />)}
        {activities.length === 0 ? <EmptyState title="No activity yet" detail="Your stock movements will show here." /> : null}
      </View>

      <SectionHeader title="Find an item" />
      <SearchBar
        value={search}
        onChangeText={(value) => { setSearch(value); setSearchOpen(Boolean(value)); }}
        placeholder="Lot code, tag, product or location"
        trailing={
          <Pressable onPress={() => setScanOpen(true)} style={styles.scanButton}>
            <MaterialCommunityIcons name="barcode-scan" size={21} color="#fff" />
          </Pressable>
        }
      />
      {searchOpen && search ? (
        <View style={styles.searchResults}>
          {matchingItems.length ? matchingItems.slice(0, 4).map((item) => (
            <Pressable key={item.id} onPress={() => router.push('/list')} style={styles.resultRow}>
              <AppText size={13} weight="600">{item.name}</AppText><AppText size={11} color={theme.colors.muted}>{item.location} · {item.sku}</AppText>
            </Pressable>
          )) : <EmptyState title="No matches" detail="Try a different item name or lot code." />}
        </View>
      ) : null}

      <FormModal
        visible={action !== null}
        title={action === 'harvest' ? 'Log a harvest' : action === 'feed' ? 'Record feed usage' : action === 'issue' ? 'Issue farm input' : 'Update livestock'}
        fields={formFields}
        initialValues={action === 'livestock' && livestock[0] ? { count: String(livestock[0].count) } : {}}
        submitLabel="Save activity"
        onClose={() => setAction(null)}
        onSubmit={submitAction}
      />
      <FormModal
        visible={scanOpen}
        title="Barcode scanner"
        fields={[{ key: 'scan', label: 'Mock scan result', options: ['Rolled oats · North silo (HARV-0091)'], required: true }]}
        initialValues={{ scan: 'Rolled oats · North silo (HARV-0091)' }}
        submitLabel="Done"
        onClose={() => setScanOpen(false)}
        onSubmit={() => setScanOpen(false)}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  notificationButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: theme.colors.surface },
  notificationDot: { position: 'absolute', right: 9, top: 8, width: 7, height: 7, backgroundColor: theme.colors.accent, borderRadius: 4, borderColor: '#fff', borderWidth: 1 },
  welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 18 },
  weatherBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: '#FFF7E9', borderRadius: 13 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '48%', minHeight: 99, padding: 12, gap: 9, backgroundColor: theme.colors.surface, borderRadius: theme.radius.medium, borderWidth: 1, borderColor: theme.colors.border },
  actionIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  panel: { paddingHorizontal: 13, paddingVertical: 4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.medium, borderWidth: 1, borderColor: theme.colors.border },
  conditions: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radius.medium, borderWidth: 1, borderColor: theme.colors.border },
  condition: { flex: 1, alignItems: 'center', gap: 6 },
  conditionDivider: { width: 1, height: 43, backgroundColor: theme.colors.border },
  scanButton: { width: 46, height: 46, backgroundColor: theme.colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchResults: { paddingHorizontal: 12, backgroundColor: theme.colors.surface, borderRadius: 13 },
  resultRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 3 },
  errorBanner: { padding: 11, marginTop: 9, borderRadius: 12, backgroundColor: theme.colors.paleRed },
  scanMock: { position: 'absolute', left: 48, right: 48, top: '45%', padding: 16, alignItems: 'center', gap: 8, borderRadius: 15, backgroundColor: '#fff', elevation: 6 },
});
