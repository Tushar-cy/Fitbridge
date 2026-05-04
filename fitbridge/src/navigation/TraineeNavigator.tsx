import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import COLORS from '../theme/colors';
import { TabBar } from '../components/layout/TabBar';

// ── Tab screens ───────────────────────────────────────────────────────────────
import { DashboardScreen }    from '../screens/trainee/DashboardScreen';
import { ExploreScreen }      from '../screens/trainee/ExploreScreen';
import { ChatListScreen }     from '../screens/shared/ChatListScreen';
import { FitFeedScreen }      from '../screens/trainee/FitFeedScreen';
import { ProgressScreen }     from '../screens/trainee/ProgressScreen';

// ── Stack screens ─────────────────────────────────────────────────────────────
import { AIScanScreen }           from '../screens/trainee/AIScanScreen';
import { TrainerProfileScreen }   from '../screens/trainee/TrainerProfileScreen';
import { BookingScreen }          from '../screens/shared/BookingScreen';
import { SessionScreen }          from '../screens/shared/SessionScreen';
import { NotificationsScreen }    from '../screens/shared/NotificationsScreen';
import { SettingsScreen }         from '../screens/shared/SettingsScreen';
import { CreatePostScreen }       from '../screens/trainer/CreatePostScreen';

import { ChatThreadScreen }   from '../screens/shared/ChatThreadScreen';
import { AITrainerChatScreen } from '../screens/shared/AITrainerChatScreen';
import { ProfileScreen }      from '../screens/shared/ProfileScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab order: Dashboard → Explore → Chat → FitFeed → Progress ───────────────
// AIScan is accessible via the Dashboard header button and DashboardScreen CTA.
const TraineeTabs: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Explore"   component={ExploreScreen} />
    <Tab.Screen name="Chat"      component={ChatListScreen} />
    <Tab.Screen name="FitFeed"   component={FitFeedScreen} />
    <Tab.Screen name="Progress"  component={ProgressScreen} />
  </Tab.Navigator>
);

// ── Root stack wraps tabs + all modal/push screens ────────────────────────────
export const TraineeNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.DARK_BG },
      animation: 'slide_from_right',
    }}
  >
    {/* Tab root */}
    <Stack.Screen name="TraineeTabs"    component={TraineeTabs} />

    {/* Trainer discovery & booking */}
    <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
    <Stack.Screen name="Booking"        component={BookingScreen} />
    <Stack.Screen name="Session"        component={SessionScreen} />

    {/* AI Scan — accessible from Dashboard header + CTA banner */}
    <Stack.Screen name="AIScan"         component={AIScanScreen} />

    {/* Chat thread (individual conversation) */}
    <Stack.Screen
      name="ChatThread"
      component={ChatThreadScreen}
      options={{ animation: 'slide_from_right' }}
    />

    {/* Notifications — pushed from Chat header bell */}
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ animation: 'slide_from_bottom' }}
    />

    {/* Settings */}
    <Stack.Screen name="Settings"       component={SettingsScreen} />

    {/* Create Post — accessible from FitFeed FAB */}
    <Stack.Screen
      name="CreatePost"
      component={CreatePostScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    {/* AI Trainer Chat */}
    <Stack.Screen
      name="AITrainerChat"
      component={AITrainerChatScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
    {/* Profile */}
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);


export default TraineeNavigator;
