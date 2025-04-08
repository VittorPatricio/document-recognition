'use client';

import {useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import DocumentSelectionScreen from './src/DocumentSelectionScreen';
import CameraScreen from './src/CameraScreen';
import React from 'react';

// Define document types
export type DocumentType = 'A4' | 'RG' | 'CPF' | 'CNH';

const App = () => {
  // State to track which screen to show
  const [currentScreen, setCurrentScreen] = useState<'selection' | 'camera'>(
    'selection',
  );
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('A4');

  // Navigation functions
  const navigateToCamera = (documentType: DocumentType) => {
    setSelectedDocument(documentType);
    setCurrentScreen('camera');
  };

  const navigateToSelection = () => {
    setCurrentScreen('selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        translucent={true}
        backgroundColor={'transparent'}
      />
      {currentScreen === 'selection' ? (
        <DocumentSelectionScreen onSelectDocument={navigateToCamera} />
      ) : (
        <CameraScreen
          documentType={selectedDocument}
          onBack={navigateToSelection}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
