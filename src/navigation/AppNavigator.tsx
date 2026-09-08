import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants
import { COLORS } from '../constants/theme';
import { useChitData } from '../context/ChitDataContext';

// Common screens
import LoginScreen from '../screens/common/LoginScreen';
import RoleSelectionScreen from '../screens/common/RoleSelectionScreen';
import ReceiptDetailScreen from '../screens/common/ReceiptDetailScreen';

// Admin screens
import DashboardScreen from '../screens/admin/DashboardScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import AddCustomerScreen from '../screens/admin/AddCustomerScreen';
import CollectionsScreen from '../screens/admin/CollectionsScreen';
import SchemesScreen from '../screens/admin/SchemesScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

// Customer screens
import HomeScreen from '../screens/customer/HomeScreen';
import MySchemesScreen from '../screens/customer/MySchemesScreen';
import PaymentsScreen from '../screens/customer/PaymentsScreen';
import ReceiptsScreen from '../screens/customer/ReceiptsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Navigation parameter types
export type RootStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  AdminTabs: undefined;
  CustomerTabs: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: undefined;
  AdminProfile: undefined;
  ReceiptDetail: { receiptId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
function AdminTabNavigator() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  
  // Lift navigation buttons higher so text labels are fully visible and comfortably elevated
  // above display edges, Android navigation bars, and iPhone home indicators
  const bottomInset = isIOS
    ? Math.max(insets.bottom, 34) + 12
    : Math.max(insets.bottom, 16) + 16;
  const tabHeight = (isIOS ? 68 : 66) + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'grid';

          if (route.name === 'Dashboard') {
            iconName = 'grid';
          } else if (route.name === 'Customers') {
            iconName = 'people';
          } else if (route.name === 'Collections') {
            iconName = 'cash';
          } else if (route.name === 'Receipts') {
            iconName = 'receipt';
          } else if (route.name === 'Schemes') {
            iconName = 'list';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          marginBottom: 2,
          letterSpacing: -0.1,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 4,
        },
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 10,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} />
      <Tab.Screen name="Schemes" component={SchemesScreen} />
    </Tab.Navigator>
  );
}

// Customer Tab Navigator
function CustomerTabNavigator() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const bottomInset = isIOS
    ? Math.max(insets.bottom, 34) + 12
    : Math.max(insets.bottom, 16) + 16;
  const tabHeight = (isIOS ? 68 : 66) + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'MySchemes') {
            iconName = 'layers';
          } else if (route.name === 'Receipts') {
            iconName = 'receipt';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: COLORS.success,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          marginBottom: 2,
          letterSpacing: -0.1,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 4,
        },
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 10,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MySchemes" component={MySchemesScreen} options={{ tabBarLabel: 'My Schemes' }} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root App Navigator
export const AppNavigator = () => {
  const { isLoggedIn, currentUserRole, isLoading } = useChitData();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isLoggedIn ? (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        </Stack.Group>
      ) : currentUserRole === 'customer' ? (
        <Stack.Group>
          <Stack.Screen name="CustomerTabs" component={CustomerTabNavigator} />
          <Stack.Screen 
            name="ReceiptDetail" 
            component={ReceiptDetailScreen}
            options={{
              presentation: 'modal',
            }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
          <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
          <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
          <Stack.Screen 
            name="ReceiptDetail" 
            component={ReceiptDetailScreen}
            options={{
              presentation: 'modal',
            }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
