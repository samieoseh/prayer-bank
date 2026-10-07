import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialDesignIcons}
              name="calendar-today"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bank">
        <NativeTabs.Trigger.Label>Bank</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialDesignIcons}
              name="format-list-bulleted"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="answered">
        <NativeTabs.Trigger.Label>Answered</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialDesignIcons}
              name="check-circle-outline"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon family={MaterialDesignIcons} name="history" />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={
            <NativeTabs.Trigger.VectorIcon
              family={MaterialDesignIcons}
              name="cog-outline"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
