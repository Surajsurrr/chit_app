import './src/utils/alertHelper';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ChitDataProvider } from './src/context/ChitDataContext';
import { ConfirmModalProvider } from './src/context/ConfirmModalContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ChitDataProvider>
        <ConfirmModalProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ConfirmModalProvider>
      </ChitDataProvider>
    </SafeAreaProvider>
  );
}
