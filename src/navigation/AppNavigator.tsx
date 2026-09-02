import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

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

// Customer screens
import HomeScreen from '../screens/customer/HomeScreen';
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
  ReceiptDetail: { receiptId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
function AdminTabNavigator() {
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
          } else if (route.name === 'Schemes') {
            iconName = 'list';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Schemes" component={SchemesScreen} />
    </Tab.Navigator>
  );
}

// Customer Tab Navigator
function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Payments') {
            iconName = 'card';
          } else if (route.name === 'Receipts') {
            iconName = 'receipt';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.success,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
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

  const initialRoute = !isLoggedIn
    ? 'Login'
    : currentUserRole === 'customer'
    ? 'CustomerTabs'
    : 'AdminTabs';

  return (
    <Stack.Navigator
      key={isLoggedIn ? (currentUserRole || 'auth') : 'guest'}
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="CustomerTabs" component={CustomerTabNavigator} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
      <Stack.Screen 
        name="ReceiptDetail" 
        component={ReceiptDetailScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
