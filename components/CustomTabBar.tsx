import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import BubbleTabBar from './BubbleTabBar';
import { Squares2X2Icon, CalendarDaysIcon, UserIcon } from 'react-native-heroicons/outline';
import { Squares2X2Icon as Squares2X2IconSolid, CalendarDaysIcon as CalendarDaysIconSolid, UserIcon as UserIconSolid } from 'react-native-heroicons/solid';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const tabs = state.routes.map((route) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? options.title ?? route.name;
    
    // Map route names to icons
    const iconMap = {
      index: {
        icon: Squares2X2Icon,
        activeIcon: Squares2X2IconSolid,
        title: 'Swipe',
      },
      schedule: {
        icon: CalendarDaysIcon,
        activeIcon: CalendarDaysIconSolid,
        title: 'Schedule',
      },
      profile: {
        icon: UserIcon,
        activeIcon: UserIconSolid,
        title: 'Profile',
      },
    };

    const config = iconMap[route.name as keyof typeof iconMap] || {
      icon: 'ellipse-outline' as const,
      activeIcon: 'ellipse' as const,
      title: String(label),
    };

    return {
      key: route.key,
      title: config.title,
      icon: config.icon,
      activeIcon: config.activeIcon,
    };
  });

  const activeTabKey = state.routes[state.index].key;

  const handleTabPress = (tabKey: string) => {
    const route = state.routes.find(r => r.key === tabKey);
    if (route) {
      navigation.navigate(route.name);
    }
  };

  return (
    <BubbleTabBar
      tabs={tabs}
      activeTab={activeTabKey}
      onTabPress={handleTabPress}
    />
  );
}