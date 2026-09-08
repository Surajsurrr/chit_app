import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChitDataProvider } from './src/context/ChitDataContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ChitDataProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ChitDataProvider>
    </SafeAreaProvider>
  );
}

