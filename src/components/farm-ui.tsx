import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { theme } from '@/constants/theme';
import type { Activity, Alert, Category, Item } from '@/types';
import { formatCurrency, getReorderThreshold, isLowStock } from '@/utils/inventory';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function LogoBadge({ size = 46 }: { size?: number }) {
  return (
    <View style={[styles.logoBadge, { width: size, height: size, borderRadius: size * 0.29 }]}>
      <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 48 48">
        <Path d="M8 22 24 10l16 12v17H8z" fill="#fff" />
        <Path d="M20 39V26h8v13M5 22 24 7l19 15" fill="none" stroke={theme.colors.secondary} strokeWidth="3.2" strokeLinejoin="round" />
        <Path d="M35 8c-5 2-7 6-6 11 4-1 7-5 6-11ZM33 17c-3 2-4 5-3 8 3-1 5-4 3-8Z" fill={theme.colors.secondary} />
        <Path d="M33 12c-1 5-2 9-3 13" fill="none" stroke={theme.colors.secondary} strokeWidth="1.6" />
        <Circle cx="13" cy="27" r="1.2" fill={theme.colors.primary} />
        <Circle cx="35" cy="27" r="1.2" fill={theme.colors.primary} />
      </Svg>
    </View>
  );
}

export function AppText({
  children,
  style,
  size = 14,
  color = theme.colors.text,
  weight = '400',
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: object;
  size?: number;
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800';
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ color, fontSize: size, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function Icon({
  name,
  size = 20,
  color = theme.colors.primary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function ScreenScroll({ children, contentStyle }: React.PropsWithChildren<{ contentStyle?: object }>) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.screenContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <AppText size={18} weight="700">{title}</AppText>
        {subtitle ? <AppText size={12} color={theme.colors.muted} style={{ marginTop: 3 }}>{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tint = theme.colors.paleGreen,
  onPress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.iconTile, { backgroundColor: tint }]}><Icon name={icon} size={21} /></View>
      <AppText size={12} color={theme.colors.muted} style={{ marginTop: 13 }}>{label}</AppText>
      <AppText size={23} weight="800" style={{ marginTop: 3 }}>{value}</AppText>
      <AppText size={11} color={theme.colors.muted} style={{ marginTop: 4 }}>{detail}</AppText>
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search inventory...',
  trailing,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <Icon name="magnify" color={theme.colors.muted} size={20} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA69A"
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {value.length > 0 ? (
          <Pressable onPress={() => onChangeText('')} accessibilityLabel="Clear search">
            <Icon name="close-circle" size={18} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function FilterChips({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={[styles.chip, selected === option && styles.chipSelected]}>
          <AppText size={12} weight="600" color={selected === option ? '#fff' : theme.colors.muted}>{option}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ItemCard({
  item,
  onEdit,
  compact = false,
  globalThreshold = 0,
  categoryThresholds,
  currency = 'USD',
}: {
  item: Item;
  onEdit: (item: Item) => void;
  compact?: boolean;
  globalThreshold?: number;
  categoryThresholds?: Partial<Record<Category, number>>;
  currency?: string;
}) {
  const low = isLowStock(item, globalThreshold, categoryThresholds);
  const threshold = getReorderThreshold(item, globalThreshold, categoryThresholds);
  const conditionColor = item.condition === 'Good' ? theme.colors.primary : theme.colors.accent;
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, { backgroundColor: item.category === 'Stored Harvests' ? '#FFF5E6' : theme.colors.paleGreen }]}>
          <Icon name={item.category === 'Stored Harvests' ? 'barley' : item.category === 'Livestock Supplies' ? 'cow' : 'package-variant'} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText size={15} weight="700">{item.name}</AppText>
          <AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{item.sku} · {item.lotCode}</AppText>
        </View>
        <Pressable onPress={() => onEdit(item)} hitSlop={10} accessibilityLabel={`Edit ${item.name}`} style={styles.editButton}>
          <Icon name="pencil-outline" size={17} color={theme.colors.muted} />
        </Pressable>
      </View>
      {!compact ? <AppText size={12} color={theme.colors.muted} style={{ marginTop: 11 }}>{item.description}</AppText> : null}
      <View style={styles.itemStats}>
        <View><AppText size={11} color={theme.colors.muted}>ON HAND</AppText><AppText size={14} weight="700" style={{ marginTop: 3 }}>{item.quantity.toLocaleString()} {item.unit}</AppText></View>
        <View><AppText size={11} color={theme.colors.muted}>VALUE</AppText><AppText size={14} weight="700" style={{ marginTop: 3 }}>{formatCurrency(item.quantity * item.unitCost, currency)}</AppText></View>
        <View style={{ alignItems: 'flex-end' }}><AppText size={11} color={theme.colors.muted}>LOCATION</AppText><AppText size={12} weight="600" style={{ marginTop: 3 }}>{item.location}</AppText></View>
      </View>
      {!compact ? <AppText size={10} color={theme.colors.muted} style={{ marginBottom: 10 }}>{formatCurrency(item.unitCost, currency)} cost · {formatCurrency(item.marketPrice, currency)} market / unit</AppText> : null}
      <View style={styles.itemFooter}>
        <View style={[styles.statusPill, { backgroundColor: low ? theme.colors.paleOrange : theme.colors.paleGreen }]}>
          <View style={[styles.statusDot, { backgroundColor: low ? theme.colors.accent : theme.colors.secondary }]} />
          <AppText size={11} weight="600" color={low ? '#A75A00' : theme.colors.primary}>{low ? `Low · reorder at ${threshold}` : item.category}</AppText>
        </View>
        <AppText size={11} color={conditionColor}>{item.quality} · {item.condition}</AppText>
      </View>
    </View>
  );
}

export function AlertBanner({ alert, onPress }: { alert: Alert; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.alertRow}>
      <View style={[styles.alertIcon, { backgroundColor: alert.kind === 'expiry' ? theme.colors.paleOrange : theme.colors.paleRed }]}>
        <Icon name={alert.kind === 'expiry' ? 'clock-alert-outline' : 'alert-circle-outline'} color={alert.kind === 'expiry' ? theme.colors.accent : theme.colors.danger} size={19} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText size={13} weight="700">{alert.title}</AppText>
        <AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{alert.detail}</AppText>
      </View>
      {alert.kind === 'low-stock' ? <Text style={styles.reorderText}>Reorder</Text> : <Text style={styles.daysBadge}>{(alert.daysRemaining ?? 0) < 0 ? 'Expired' : `${alert.daysRemaining}d`}</Text>}
    </Pressable>
  );
}

const activityIcon: Record<Activity['kind'], IconName> = {
  added: 'plus-circle-outline',
  harvested: 'sprout',
  sold: 'cart-check',
  fed: 'cow',
  'written off': 'delete-outline',
  updated: 'pencil-circle-outline',
};

export function ActivityFeedItem({ activity }: { activity: Activity }) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityIcon}><Icon name={activityIcon[activity.kind]} size={18} /></View>
      <View style={{ flex: 1 }}>
        <AppText size={13} weight="600">{activity.title}</AppText>
        <AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{activity.detail}</AppText>
      </View>
      <AppText size={10} color={theme.colors.muted}>{activity.timestamp}</AppText>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Icon name="sprout" size={27} /></View>
      <AppText size={15} weight="700">{title}</AppText>
      <AppText size={12} color={theme.colors.muted} style={{ textAlign: 'center', marginTop: 5 }}>{detail}</AppText>
    </View>
  );
}

export interface FormField {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  options?: string[];
}

export function FormModal({
  visible,
  title,
  fields,
  initialValues,
  submitLabel = 'Save changes',
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  fields: FormField[];
  initialValues?: Record<string, string>;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <AppText size={20} weight="800">{title}</AppText>
              <Pressable onPress={onClose} style={styles.closeButton}><Icon name="close" color={theme.colors.muted} /></Pressable>
            </View>
            <FormModalFields fields={fields} initialValues={initialValues} submitLabel={submitLabel} onSubmit={onSubmit} />
            {Platform.OS === 'web' ? <View style={{ height: 8 }} /> : null}
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

function FormModalFields({
  fields,
  initialValues,
  submitLabel,
  onSubmit,
}: {
  fields: FormField[];
  initialValues?: Record<string, string>;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const submit = () => {
    if (fields.some((field) => field.required && !values[field.key]?.trim())) return;
    onSubmit(values);
  };

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
        {fields.map((field) => (
          <View key={field.key} style={{ marginTop: 15 }}>
            <AppText size={12} weight="600" color={theme.colors.muted}>{field.label}</AppText>
            {field.options ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {field.options.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setValues((current) => ({ ...current, [field.key]: option }))}
                    style={[styles.optionChip, values[field.key] === option && styles.optionSelected]}>
                    <AppText size={12} weight="600" color={values[field.key] === option ? '#fff' : theme.colors.muted}>{option}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <TextInput
                value={values[field.key] ?? ''}
                onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                placeholder={field.placeholder ?? field.label}
                placeholderTextColor="#A3ADA3"
                keyboardType={field.keyboardType ?? 'default'}
                style={styles.formInput}
              />
            )}
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.86 }]}>
        <AppText size={14} weight="700" color="#fff">{submitLabel}</AppText>
        <Icon name="arrow-right" size={18} color="#fff" />
      </Pressable>
    </>
  );
}

export function LoadingState() {
  return <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><AppText size={13} color={theme.colors.muted}>Loading your farm...</AppText></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  screenContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34 },
  logoBadge: { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  statCard: { flex: 1, minHeight: 145, padding: 15, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, ...theme.shadow },
  iconTile: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  searchBox: { minHeight: 46, flex: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 13, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, paddingVertical: 10, color: theme.colors.text, fontSize: 13 },
  chipRow: { gap: 8, paddingVertical: 3 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 30, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  itemCard: { padding: 15, marginBottom: 11, backgroundColor: theme.colors.surface, borderRadius: theme.radius.medium, borderWidth: 1, borderColor: '#EFF2ED', ...theme.shadow },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: { width: 41, height: 41, justifyContent: 'center', alignItems: 'center', borderRadius: 13 },
  editButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: theme.colors.background },
  itemStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 30, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  alertRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  alertIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  reorderText: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  daysBadge: { color: '#A75A00', fontSize: 11, fontWeight: '700', backgroundColor: theme.colors.paleOrange, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  activityIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: theme.colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  emptyState: { paddingVertical: 28, paddingHorizontal: 25, alignItems: 'center' },
  emptyIcon: { width: 54, height: 54, backgroundColor: theme.colors.paleGreen, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,30,17,0.46)' },
  sheet: { maxHeight: '90%', paddingHorizontal: 22, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 20, backgroundColor: theme.colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  sheetHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: '#D8DED6', alignSelf: 'center', marginBottom: 14 },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  closeButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  formInput: { minHeight: 45, paddingHorizontal: 12, marginTop: 7, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, color: theme.colors.text, fontSize: 14 },
  optionRow: { gap: 7, paddingTop: 9 },
  optionChip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 20, backgroundColor: theme.colors.background },
  optionSelected: { backgroundColor: theme.colors.primary },
  primaryButton: { height: 50, marginTop: 18, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  loading: { flex: 1, gap: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
});
