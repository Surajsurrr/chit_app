import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Platform, TouchableOpacity, Text } from 'react-native';
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

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets: any;
}

// Custom Tab Bar for Admin to guarantee zero text clipping and proper elevation on Web, iOS & Android
function AdminCustomTabBar({ state, descriptors, navigation, insets }: CustomTabBarProps) {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  // Comfortable bottom clearance lifting buttons well above screen edges,
  // Android navigation bar, and iPhone home indicator
  const bottomPadding = isIOS
    ? Math.max(insets.bottom, 34) + 6
    : isWeb
      ? 16
      : Math.max(insets.bottom, 12) + 14;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        paddingBottom: bottomPadding,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: keyof typeof Ionicons.glyphMap = 'grid';
        if (route.name === 'Dashboard') iconName = 'grid';
        else if (route.name === 'Customers') iconName = 'people';
        else if (route.name === 'Collections') iconName = 'cash';
        else if (route.name === 'Receipts') iconName = 'receipt';

        const color = isFocused ? COLORS.secondary : COLORS.textMuted;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 3,
            }}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text
              numberOfLines={1}
              style={{
                color,
                fontSize: 11,
                fontWeight: isFocused ? '700' : '600',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Custom Tab Bar for Customer
function CustomerCustomTabBar({ state, descriptors, navigation, insets }: CustomTabBarProps) {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const bottomPadding = isIOS
    ? Math.max(insets.bottom, 34) + 6
    : isWeb
      ? 16
      : Math.max(insets.bottom, 12) + 14;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        paddingBottom: bottomPadding,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'Payments') iconName = 'wallet';
        else if (route.name === 'Receipts') iconName = 'receipt';
        else if (route.name === 'Profile') iconName = 'person';

        const color = isFocused ? COLORS.success : COLORS.textMuted;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 3,
            }}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text
              numberOfLines={1}
              style={{
                color,
                fontSize: 11,
                fontWeight: isFocused ? '700' : '600',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Admin Tab Navigator
function AdminTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AdminCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} />
    </Tab.Navigator>
  );
}

// Customer Tab Navigator
function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomerCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
