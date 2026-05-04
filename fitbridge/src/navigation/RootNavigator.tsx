import React from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import COLORS from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator }    from './AuthNavigator';
import { TraineeNavigator } from './TraineeNavigator';
import { TrainerNavigator } from './TrainerNavigator';
import { BrandNavigator }   from './BrandNavigator';
import { OrgNavigator }     from './OrgNavigator';

const Stack = createNativeStackNavigator();

const FitBridgeDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.PRIMARY,
    background: COLORS.DARK_BG,
    card: COLORS.CARD_BG,
    text: COLORS.TEXT_PRIMARY,
    border: COLORS.CARD_BORDER,
    notification: COLORS.SECONDARY,
  },
};

function AdminScreen() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ color: '#F1F5F9', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
        Admin Panel
      </Text>
      <Text style={{ color: '#94A3B8', textAlign: 'center', marginBottom: 32 }}>
        The mobile admin panel is coming soon.{'\n'}
        Use the web dashboard at admin.fitbridge.app
      </Text>
      <TouchableOpacity
        onPress={logout}
        style={{ backgroundColor: '#EF4444', padding: 14, borderRadius: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const AppNavigator: React.FC = () => {
  const role = useAuthStore((s) => s.role);

  // Admin users are directed to use the Next.js web dashboard (`fitbridge-admin`).
  // This placeholder prevents them from falling through to the trainee UI.
  if (role === 'admin')   return <AdminScreen />;

  if (role === 'trainer') return <TrainerNavigator />;
  if (role === 'brand')   return <BrandNavigator />;
  if (role === 'org')     return <OrgNavigator />;
  // Default: trainee
  return <TraineeNavigator />;
};

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={FitBridgeDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
