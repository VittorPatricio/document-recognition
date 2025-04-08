import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import DocumentSelectionScreen from './src/DocumentSelectionScreen';
import CameraScreen from './src/CameraScreen';
import React from 'react';

// Define the types for our navigation parameters
export type DocumentType = 'A4' | 'RG' | 'CPF' | 'CNH';

export type RootStackParamList = {
  DocumentSelection: undefined;
  Camera: {documentType: DocumentType};
};

// Create the stack navigator
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="DocumentSelection"
        screenOptions={{
          headerShown: false,
          // This uses the default transitions which are less likely to cause issues
        }}>
        <Stack.Screen
          name="DocumentSelection"
          component={DocumentSelectionScreen}
        />
        <Stack.Screen name="Camera" component={CameraScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
