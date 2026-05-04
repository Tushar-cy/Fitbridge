import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from '../theme/colors';
import { TabBar } from '../components/layout/TabBar';
import { OrgDashboardScreen } from '../screens/org/OrgDashboardScreen';
import { GroupBookingScreen } from '../screens/org/GroupBookingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const OrgTabs = () => (
  <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen
      name="OrgHome"
      component={OrgDashboardScreen}
      options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ size }) => <Text style={{ fontSize: size, lineHeight: size + 4 }}>🏢</Text> }}
    />
    <Tab.Screen
      name="GroupBooking"
      component={GroupBookingScreen}
      options={{ tabBarLabel: 'Book Group', tabBarIcon: ({ size }) => <Text style={{ fontSize: size, lineHeight: size + 4 }}>📅</Text> }}
    />
  </Tab.Navigator>
);

export const TabNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.DARK_BG } }}>
    <Stack.Screen name="OrgTabs" component={OrgTabs} />
    <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
  </Stack.Navigator>
);

export default TabNavigator;
