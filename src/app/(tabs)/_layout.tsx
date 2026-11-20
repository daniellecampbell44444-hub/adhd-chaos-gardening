import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e2e8f0' },
        headerStyle: { backgroundColor: '#14532d' },
        headerTintColor: '#ffffff',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Plants',
          tabBarIcon: ({ color, size }) => <Ionicons name="flower" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="seeds"
        options={{
          title: 'Seeds & $',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
