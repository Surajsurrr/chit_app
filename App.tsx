import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ChitDataProvider } from './src/context/ChitDataContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ChitDataProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ChitDataProvider>
  );
}
