import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { seedActivities, seedItems, seedLivestock, seedSettings } from '@/data/seed';
import type { Activity, Item, Livestock } from '@/types';

const STORAGE_KEY = 'farm-inventory-v1';

interface StoredState {
  items: Item[];
  livestock: Livestock[];
  activities: Activity[];
  settings: Record<string, string | number | boolean | string[]>;
}

interface InventoryContextValue extends StoredState {
  isReady: boolean;
  storageError: string | null;
  updateError: string | null;
  clearUpdateError: () => void;
  saveItem: (item: Item) => void;
  changeQuantity: (itemId: string, amount: number, action: Activity['kind'], description?: string) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  updateSetting: (key: string, value: string | number | boolean | string[]) => void;
  saveLivestock: (animal: Livestock) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

const initialState: StoredState = {
  items: seedItems,
  livestock: seedLivestock,
  activities: seedActivities,
  settings: seedSettings,
};

export function InventoryProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<StoredState>(initialState);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<StoredState>;
          setState({
            items: Array.isArray(parsed.items) ? parsed.items : seedItems,
            livestock: Array.isArray(parsed.livestock) ? parsed.livestock : seedLivestock,
            activities: Array.isArray(parsed.activities) ? parsed.activities : seedActivities,
            settings: parsed.settings && typeof parsed.settings === 'object'
              ? { ...seedSettings, ...parsed.settings }
              : seedSettings,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) setStorageError(`Saved farm data could not be loaded: ${String(error)}`);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error: unknown) => {
      setStorageError(`Farm data could not be saved: ${String(error)}`);
    });
  }, [isReady, state]);

  const mutate = useCallback((change: (current: StoredState) => StoredState) => {
    setState((current) => change(current));
    setUpdateError(null);
    Haptics.selectionAsync().catch((error: unknown) => {
      console.warn('Farm action haptic feedback is unavailable.', error);
    });
  }, []);

  const saveItem = useCallback((item: Item) => {
    mutate((current) => {
      const exists = current.items.some((entry) => entry.id === item.id);
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        title: exists ? 'Inventory updated' : 'Stock added',
        detail: `${item.name} · ${item.quantity} ${item.unit}`,
        kind: exists ? 'updated' : 'added',
        timestamp: 'Just now',
      };
      return {
        ...current,
        items: exists
          ? current.items.map((entry) => (entry.id === item.id ? item : entry))
          : [item, ...current.items],
        activities: [activity, ...current.activities].slice(0, 30),
      };
    });
  }, [mutate]);

  const changeQuantity = useCallback(
    (itemId: string, amount: number, action: Activity['kind'], description?: string) => {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) {
        setUpdateError('That inventory item could not be found.');
        return;
      }
      const nextQuantity = item.quantity + amount;
      if (nextQuantity < 0 && state.settings.negativeStock === 'block') {
        setUpdateError(`Not enough ${item.name} in stock to complete this action.`);
        return;
      }
      const shouldWarn = nextQuantity < 0 && state.settings.negativeStock === 'warn';
      mutate((current) => ({
        ...current,
        items: current.items.map((entry) =>
          entry.id === itemId ? { ...entry, quantity: nextQuantity, updatedAt: new Date().toISOString().slice(0, 10) } : entry,
        ),
        activities: [
          {
            id: `${Date.now()}-${Math.random()}`,
            title: `${action.charAt(0).toUpperCase()}${action.slice(1)} recorded`,
            detail: description ?? `${item.name} · ${Math.abs(amount)} ${item.unit}`,
            kind: action,
            timestamp: 'Just now',
          },
          ...current.activities,
        ].slice(0, 30),
      }));
      if (shouldWarn) setUpdateError(`${item.name} will be recorded with negative stock.`);
    },
    [mutate, state.items, state.settings.negativeStock],
  );

  const addActivity = useCallback(
    (activity: Omit<Activity, 'id' | 'timestamp'>) => {
      mutate((current) => ({
        ...current,
        activities: [{ ...activity, id: `${Date.now()}-${Math.random()}`, timestamp: 'Just now' }, ...current.activities].slice(0, 30),
      }));
    },
    [mutate],
  );

  const updateSetting = useCallback(
    (key: string, value: string | number | boolean | string[]) => {
      mutate((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
    },
    [mutate],
  );

  const saveLivestock = useCallback((animal: Livestock) => {
    mutate((current) => {
      const exists = current.livestock.some((entry) => entry.id === animal.id);
      const activity: Activity = {
        id: `${Date.now()}-${Math.random()}`,
        title: exists ? 'Herd count updated' : 'Livestock added',
        detail: `${animal.type} · ${animal.count} head · ${animal.location}`,
        kind: 'updated',
        timestamp: 'Just now',
      };
      return {
        ...current,
        livestock: exists
          ? current.livestock.map((entry) => (entry.id === animal.id ? animal : entry))
          : [...current.livestock, animal],
        activities: [activity, ...current.activities].slice(0, 30),
      };
    });
  }, [mutate]);

  const value = useMemo(
    () => ({
      ...state,
      isReady,
      storageError,
      updateError,
      clearUpdateError: () => setUpdateError(null),
      saveItem,
      changeQuantity,
      addActivity,
      updateSetting,
      saveLivestock,
    }),
    [state, isReady, storageError, updateError, saveItem, changeQuantity, addActivity, updateSetting, saveLivestock],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('useInventory must be used inside InventoryProvider.');
  return value;
}
