import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, FormModal, ScreenScroll } from '@/components/farm-ui';
import { theme } from '@/constants/theme';
import { useInventory } from '@/context/inventory-context';
import { coreCategories } from '@/types';

function SettingGroup({ title, icon, children }: React.PropsWithChildren<{ title: string; icon: 'tune-variant' | 'ruler' | 'shape-outline' | 'cash-multiple' | 'warehouse' | 'barcode-scan' | 'account-group' }>) {
  return (
    <View style={styles.group}>
      <View style={styles.groupTitle}><View style={styles.groupIcon}><MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} /></View><AppText size={15} weight="700">{title}</AppText></View>
      {children}
    </View>
  );
}

function SettingRow({ title, detail, children }: React.PropsWithChildren<{ title: string; detail?: string }>) {
  return <View style={styles.row}><View style={{ flex: 1, paddingRight: 12 }}><AppText size={13} weight="600">{title}</AppText>{detail ? <AppText size={11} color={theme.colors.muted} style={{ marginTop: 3 }}>{detail}</AppText> : null}</View>{children}</View>;
}

function ChoiceRow({ values, selected, onChange }: { values: string[]; selected: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.choices}>
      {values.map((value) => (
        <Pressable key={value} onPress={() => onChange(value)} style={[styles.choice, selected === value && styles.choiceActive]}>
          <AppText size={11} weight="600" color={selected === value ? theme.colors.primary : theme.colors.muted}>{value}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

function ThresholdControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepButton}><AppText size={17} weight="700">−</AppText></Pressable>
      <AppText size={14} weight="700">{value}</AppText>
      <Pressable onPress={() => onChange(value + 1)} style={styles.stepButton}><AppText size={17} weight="700">+</AppText></Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const { items, settings, updateSetting, isReady, storageError } = useInventory();
  const [locationModal, setLocationModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const locations = Array.isArray(settings.locations) ? settings.locations : [];
  const categories = Array.isArray(settings.categories) ? settings.categories : [...coreCategories];
  const enabled = (key: string) => settings[key] === true;
  const toggle = (key: string) => updateSetting(key, !enabled(key));

  if (!isReady) return <View style={styles.loading}><AppText>Loading settings...</AppText></View>;

  return (
    <ScreenScroll contentStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View><AppText size={25} weight="800">Settings</AppText><AppText size={12} color={theme.colors.muted} style={{ marginTop: 5 }}>Make Farm Inventory work your way.</AppText></View>
        <View style={styles.headerIcon}><MaterialCommunityIcons name="cog-outline" size={22} color={theme.colors.primary} /></View>
      </View>
      {storageError ? <View style={styles.error}><AppText size={12} color={theme.colors.danger}>{storageError}</AppText></View> : null}

      <SettingGroup title="Units of measurement" icon="ruler">
        <SettingRow title="Weight standard"><ChoiceRow values={['kg', 'lb', 'tons']} selected={String(settings.weightUnit)} onChange={(value) => updateSetting('weightUnit', value)} /></SettingRow>
        <SettingRow title="Volume standard"><ChoiceRow values={['L', 'gal', 'bushels']} selected={String(settings.volumeUnit)} onChange={(value) => updateSetting('volumeUnit', value)} /></SettingRow>
        <SettingRow title="Area units"><ChoiceRow values={['hectares', 'acres', 'm²']} selected={String(settings.areaUnit)} onChange={(value) => updateSetting('areaUnit', value)} /></SettingRow>
      </SettingGroup>

      <SettingGroup title="Stock & reorder thresholds" icon="tune-variant">
        <SettingRow title="Global low-stock alert" detail="Notify when quantity falls below this level">
          <ThresholdControl value={Number(settings.globalThreshold)} onChange={(value) => updateSetting('globalThreshold', value)} />
        </SettingRow>
        {[
          ['Seeds & crop inputs', 'thresholdSeeds'],
          ['Livestock supplies', 'thresholdLivestock'],
          ['Stored harvests', 'thresholdHarvests'],
          ['Finished goods', 'thresholdGoods'],
        ].map(([label, key]) => (
          <SettingRow key={key} title={`${label} threshold`} detail="Fallback if an item has no custom threshold">
            <ThresholdControl value={Number(settings[key]) || 0} onChange={(value) => updateSetting(key, value)} />
          </SettingRow>
        ))}
        <SettingRow title="When stock goes negative" detail="Control deductions beyond available stock">
          <ChoiceRow values={['allow', 'warn', 'block']} selected={String(settings.negativeStock)} onChange={(value) => updateSetting('negativeStock', value)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Categories & classification" icon="shape-outline">
        <SettingRow title="Item categories" detail="Used by the inventory list and item forms">
          <Pressable onPress={() => setCategoryModal(true)} style={styles.addLocation}><MaterialCommunityIcons name="plus" size={15} color={theme.colors.primary} /><AppText size={11} weight="700" color={theme.colors.primary}>Add</AppText></Pressable>
        </SettingRow>
        <View style={styles.locationList}>
          {categories.map((category) => {
            const isBuiltIn = coreCategories.some((builtIn) => builtIn === category);
            const isUsed = items.some((item) => item.category === category);
            return (
              <View key={category} style={styles.locationChip}>
                <AppText size={11} weight="600">{category}</AppText>
                {!isBuiltIn && !isUsed ? (
                  <Pressable onPress={() => updateSetting('categories', categories.filter((entry) => entry !== category))} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={14} color={theme.colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        <SettingRow title="Lot coding convention" detail="Used for new batch and harvest codes"><ChoiceRow values={['Crop-Field-Date', 'Date-Item-Seq']} selected={String(settings.lotConvention)} onChange={(value) => updateSetting('lotConvention', value)} /></SettingRow>
      </SettingGroup>

      <SettingGroup title="Valuation & accounting" icon="cash-multiple">
        <SettingRow title="Valuation method"><ChoiceRow values={['FIFO', 'LIFO', 'Average Cost', 'Unit-Price']} selected={String(settings.valuation)} onChange={(value) => updateSetting('valuation', value)} /></SettingRow>
        <SettingRow title="Default currency"><ChoiceRow values={['USD', 'CAD', 'EUR', 'AUD']} selected={String(settings.currency)} onChange={(value) => updateSetting('currency', value)} /></SettingRow>
        <SettingRow title="Fiscal year starts"><ChoiceRow values={months} selected={String(settings.fiscalYearStart)} onChange={(value) => updateSetting('fiscalYearStart', value)} /></SettingRow>
        <SettingRow title="Fiscal year ends"><ChoiceRow values={months} selected={String(settings.fiscalYearEnd)} onChange={(value) => updateSetting('fiscalYearEnd', value)} /></SettingRow>
      </SettingGroup>

      <SettingGroup title="Locations & farm structure" icon="warehouse">
        <SettingRow title="Storage locations" detail={`${locations.length} facilities and blocks`} />
        <View style={styles.locationList}>
          {locations.map((location) => (
            <View key={location} style={styles.locationChip}>
              <AppText size={11} weight="600">{location}</AppText>
              <Pressable onPress={() => updateSetting('locations', locations.filter((entry) => entry !== location))} hitSlop={8}><MaterialCommunityIcons name="close" size={14} color={theme.colors.muted} /></Pressable>
            </View>
          ))}
          <Pressable onPress={() => setLocationModal(true)} style={styles.addLocation}><MaterialCommunityIcons name="plus" size={15} color={theme.colors.primary} /><AppText size={11} weight="700" color={theme.colors.primary}>Add location</AppText></Pressable>
        </View>
      </SettingGroup>

      <SettingGroup title="Integrations & hardware" icon="barcode-scan">
        <SettingRow title="Barcode & QR scanning" detail="Use the in-app scanner demo"><Switch value={enabled('barcodeScanner')} onValueChange={() => toggle('barcodeScanner')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
        <SettingRow title="Weather sync" detail="Local forecasts and field conditions"><Switch value={enabled('weatherSync')} onValueChange={() => toggle('weatherSync')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
        <SettingRow title="Accounting integration"><Switch value={enabled('accountingSync')} onValueChange={() => toggle('accountingSync')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
        <SettingRow title="Supplier portal"><Switch value={enabled('supplierPortal')} onValueChange={() => toggle('supplierPortal')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
      </SettingGroup>

      <SettingGroup title="User permissions" icon="account-group">
        <SettingRow title="Farm managers" detail="Full stock control"><Switch value={enabled('managerEdit')} onValueChange={() => toggle('managerEdit')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
        <SettingRow title="Field hands" detail="Update harvests and feed usage"><Switch value={enabled('fieldHandEdit')} onValueChange={() => toggle('fieldHandEdit')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
        <SettingRow title="Accountants" detail="View-only financial access"><Switch value={enabled('accountantEdit')} onValueChange={() => toggle('accountantEdit')} trackColor={{ true: theme.colors.secondary }} thumbColor="#fff" /></SettingRow>
      </SettingGroup>
      <AppText size={11} color={theme.colors.muted} style={{ textAlign: 'center', marginTop: 18 }}>Farm Inventory · Settings are saved automatically</AppText>
      <FormModal visible={categoryModal} title="Add item category" fields={[{ key: 'category', label: 'Category name', placeholder: 'e.g. Greenhouse supplies', required: true }]} onClose={() => setCategoryModal(false)} onSubmit={({ category }) => { const name = category.trim(); if (name && !categories.includes(name)) updateSetting('categories', [...categories, name]); setCategoryModal(false); }} />
      <FormModal visible={locationModal} title="Add farm location" fields={[{ key: 'location', label: 'Location name', placeholder: 'e.g. South field block', required: true }]} onClose={() => setLocationModal(false)} onSubmit={({ location }) => { const name = location.trim(); if (name && !locations.includes(name)) updateSetting('locations', [...locations, name]); setLocationModal(false); }} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: theme.colors.paleGreen, justifyContent: 'center', alignItems: 'center' },
  error: { padding: 10, marginTop: 12, borderRadius: 12, backgroundColor: theme.colors.paleRed },
  group: { paddingHorizontal: 14, marginTop: 13, borderRadius: theme.radius.medium, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  groupTitle: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 14, paddingBottom: 7 },
  groupIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.colors.paleGreen, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 55, paddingVertical: 9, borderTopWidth: 1, borderTopColor: theme.colors.border },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: '62%' },
  choice: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: theme.colors.background },
  choiceActive: { backgroundColor: theme.colors.paleGreen },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  stepButton: { width: 27, height: 27, borderRadius: 9, backgroundColor: theme.colors.paleGreen, justifyContent: 'center', alignItems: 'center' },
  locationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 10, backgroundColor: theme.colors.background },
  addLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.secondary },
});

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
