import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import COLORS from '../theme/colors';
import { TabBar } from '../components/layout/TabBar';

// ── Tab screens ───────────────────────────────────────────────────────────────
import { TrainerDashboardScreen } from '../screens/trainer/TrainerDashboardScreen';
import { ScheduleScreen }         from '../screens/trainer/ScheduleScreen';
import { ChatListScreen }         from '../screens/shared/ChatListScreen';
import { MyTraineesScreen }       from '../screens/trainer/MyTraineesScreen';
import { EarningsScreen }         from '../screens/trainer/EarningsScreen';

// ── Stack screens ─────────────────────────────────────────────────────────────
import { SessionScreen }        from '../screens/shared/SessionScreen';
import { FitFeedScreen }        from '../screens/trainee/FitFeedScreen';
import { TrainerProfileScreen } from '../screens/trainee/TrainerProfileScreen';
import { BookingScreen }        from '../screens/shared/BookingScreen';
import { CreatePostScreen }     from '../screens/trainer/CreatePostScreen';
import { NotificationsScreen }  from '../screens/shared/NotificationsScreen';

import { ChatThreadScreen }  from '../screens/shared/ChatThreadScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab order: Home → Schedule → Chat → Trainees → Earnings ──────────────────
const TrainerTabs: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="TrainerHome" component={TrainerDashboardScreen} />
    <Tab.Screen name="Schedule"    component={ScheduleScreen} />
    <Tab.Screen name="Chat"        component={ChatListScreen} />
    <Tab.Screen name="Trainees"    component={MyTraineesScreen} />
    <Tab.Screen name="Earnings"    component={EarningsScreen} />
  </Tab.Navigator>
);

// ── Root stack wraps tabs + all modal/push screens ────────────────────────────
export const TrainerNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.DARK_BG },
      animation: 'slide_from_right',
    }}
  >
    {/* Tab root */}
    <Stack.Screen name="TrainerTabs"    component={TrainerTabs} />

    {/* Session management */}
    <Stack.Screen name="Session"        component={SessionScreen} />
    <Stack.Screen name="Booking"        component={BookingScreen} />

    {/* Content creation */}
    <Stack.Screen name="CreatePost"     component={CreatePostScreen} />
    <Stack.Screen name="Feed"           component={FitFeedScreen} />

    {/* Profile */}
    <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />

    {/* Chat thread (individual conversation) */}
    <Stack.Screen
      name="ChatThread"
      component={ChatThreadScreen}
      options={{ animation: 'slide_from_right' }}
    />

    {/* Notifications — accessible from Chat screen header bell */}
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

export default TrainerNavigator;
