'use client';

import {useEffect} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  Dimensions,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {Canvas, Rect} from '@shopify/react-native-skia';
import type {DocumentType} from '../App';
import React from 'react';

type CameraScreenProps = {
  documentType: DocumentType;
  onBack: () => void;
};

const CameraScreen = ({documentType, onBack}: CameraScreenProps) => {
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  useEffect(() => {
    requestPermission();
  }, []);

  if (!hasPermission)
    return (
      <SafeAreaView
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>No Permission</Text>
      </SafeAreaView>
    );
  if (!device)
    return (
      <SafeAreaView
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>No Device</Text>
      </SafeAreaView>
    );

  const DocumentFrame = () => {
    // Get screen dimensions
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Document dimensions in mm
    let documentWidth: number;
    let documentHeight: number;

    switch (documentType) {
      case 'A4':
        documentWidth = 210;
        documentHeight = 297;
        break;
      case 'RG':
        documentWidth = 96;
        documentHeight = 65;
        break;
      case 'CPF':
        documentWidth = 66;
        documentHeight = 99;
        break;
      case 'CNH':
        documentWidth = 85;
        documentHeight = 60;
        break;
      default:
        documentWidth = 210;
        documentHeight = 297;
    }

    // Calculate aspect ratio
    const documentRatio = documentWidth / documentHeight;

    // Calculate the maximum size that fits on screen with margins
    const MARGIN = 40; // Margin from screen edges
    const availableWidth = screenWidth - MARGIN * 2;
    const availableHeight = screenHeight - MARGIN * 2;

    // Determine if width or height is the limiting factor
    let rectWidth, rectHeight;

    if (availableWidth / availableHeight < documentRatio) {
      // Width is the limiting factor
      rectWidth = availableWidth;
      rectHeight = rectWidth / documentRatio;
    } else {
      // Height is the limiting factor
      rectHeight = availableHeight;
      rectWidth = rectHeight * documentRatio;
    }

    // Calculate position to center the rectangle
    const x = (screenWidth - rectWidth) / 2;
    const y = (screenHeight - rectHeight) / 2;

    const cornerSize = 20;

    return (
      <Canvas style={styles.canvas}>
        {/* Semi-transparent fill */}
        <Rect
          x={x}
          y={y}
          width={rectWidth}
          height={rectHeight}
          color="rgba(176, 224, 230, 0.3)" // Lighter blue with transparency
        />
        {/* Border */}
        <Rect
          x={x}
          y={y}
          width={rectWidth}
          height={rectHeight}
          color="#4682B4" // Stronger blue
          style="stroke"
          strokeWidth={3}
        />
        {/* Corner markers for better visibility */}
        {/* Top-left corner */}
        <Rect x={x} y={y} width={cornerSize} height={3} color="#4682B4" />
        <Rect x={x} y={y} width={3} height={cornerSize} color="#4682B4" />
        {/* Top-right corner */}
        <Rect
          x={x + rectWidth - cornerSize}
          y={y}
          width={cornerSize}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x + rectWidth - 3}
          y={y}
          width={3}
          height={cornerSize}
          color="#4682B4"
        />
        {/* Bottom-left corner */}
        <Rect
          x={x}
          y={y + rectHeight - 3}
          width={cornerSize}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x}
          y={y + rectHeight - cornerSize}
          width={3}
          height={cornerSize}
          color="#4682B4"
        />
        {/* Bottom-right corner */}
        <Rect
          x={x + rectWidth - cornerSize}
          y={y + rectHeight - 3}
          width={cornerSize}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x + rectWidth - 3}
          y={y + rectHeight - cornerSize}
          width={3}
          height={cornerSize}
          color="#4682B4"
        />
      </Canvas>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
      <DocumentFrame />

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Document type indicator */}
      <View style={styles.documentTypeContainer}>
        <Text style={styles.documentTypeText}>
          {documentType === 'A4'
            ? 'Folha A4'
            : documentType === 'RG'
            ? 'RG'
            : documentType === 'CPF'
            ? 'CPF'
            : 'CNH'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  documentTypeContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  documentTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CameraScreen;
