import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Constants
import { COLORS } from '../constants/theme';

// Common screens
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
  return (
    <Stack.Navigator
      initialRouteName="RoleSelection"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      
      {/* Portals */}
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="CustomerTabs" component={CustomerTabNavigator} />
      
      {/* Shared and overlay sub-flows */}
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
      
      <Stack.Screen 
        name="ReceiptDetail" 
        component={ReceiptDetailScreen}
        options={{
          presentation: 'modal', // slide-up animation on iOS
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
