import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList style={styles.tabList}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton>Pulse</TabButton>
        </TabTrigger>
        <TabTrigger name="plants" href="/plants" asChild>
          <TabButton>Plants</TabButton>
        </TabTrigger>
        <TabTrigger name="care" href="/care" asChild>
          <TabButton>Care</TabButton>
        </TabTrigger>
        <TabTrigger name="seeds" href="/seeds" asChild>
          <TabButton>Seeds</TabButton>
        </TabTrigger>
        <TabTrigger name="guide" href="/guide" asChild>
          <TabButton>Guide</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, style, ...props }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tab, style, pressed && styles.pressed]}
    >
      <ThemedText type="smallBold">{children}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    backgroundColor: '#ffffff',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});