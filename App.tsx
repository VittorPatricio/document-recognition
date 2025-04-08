import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DocumentSelectionScreen from './src/DocumentSelection';
import CameraScreen from './src/CameraScreen';
import React from 'react';

export type DocumentType = 'A4' | 'RG' | 'CPF' | 'CNH';

export type RootStackParamList = {
  DocumentSelection: undefined;
  Camera: {documentType: DocumentType};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="DocumentSelection">
        <Stack.Screen
          name="DocumentSelection"
          component={DocumentSelectionScreen}
          options={{title: 'Selecione o Documento'}}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            title: 'Capturar Documento',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
