import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InventoryProvider } from '@/context/inventory-context';
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <InventoryProvider>
        <FarmTabs />
      </InventoryProvider>
    </SafeAreaProvider>
  );
}

function FarmTabs() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: '#8B978B',
          tabBarStyle: {
            height: 58 + insets.bottom,
            paddingTop: 7,
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E7ECE4',
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant" size={size} color={String(color ?? '#2E7D32')} /> }} />
        <Tabs.Screen name="list" options={{ title: 'List', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-bulleted" size={size} color={String(color ?? '#2E7D32')} /> }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog-outline" size={size} color={String(color ?? '#2E7D32')} /> }} />
        <Tabs.Screen name="inventory" options={{ title: 'Inventory', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="warehouse" size={size} color={String(color ?? '#2E7D32')} /> }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
  );
}
