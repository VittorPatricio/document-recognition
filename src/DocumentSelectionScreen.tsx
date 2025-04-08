import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {Canvas, Rect} from '@shopify/react-native-skia';
import type {DocumentType} from '../App';
import React from 'react';

type DocumentSelectionScreenProps = {
  onSelectDocument: (documentType: DocumentType) => void;
};

type DocumentOption = {
  type: DocumentType;
  title: string;
  dimensions: string;
  width: number;
  height: number;
};

const DocumentSelectionScreen = ({
  onSelectDocument,
}: DocumentSelectionScreenProps) => {
  const documentOptions: DocumentOption[] = [
    {
      type: 'A4',
      title: 'Folha A4',
      dimensions: '210 x 297 mm',
      width: 210,
      height: 297,
    },
    {type: 'RG', title: 'RG', dimensions: '96 x 65 mm', width: 96, height: 65},
    {
      type: 'CPF',
      title: 'CPF',
      dimensions: '66 x 99 mm',
      width: 66,
      height: 99,
    },
    {
      type: 'CNH',
      title: 'CNH',
      dimensions: '85 x 60 mm',
      width: 85,
      height: 60,
    },
  ];

  const DocumentPreview = ({
    width,
    height,
    type,
  }: {
    width: number;
    height: number;
    type?: DocumentType;
  }) => {
    // Scale down the document for preview
    const SCALE_FACTOR = type == 'A4' ? 0.32 : 0.68;
    const previewWidth = width * SCALE_FACTOR;
    const previewHeight = height * SCALE_FACTOR;

    // Center the preview
    const x = (100 - previewWidth) / 2;
    const y = (100 - previewHeight) / 2;

    return (
      <Canvas style={styles.previewCanvas}>
        <Rect
          x={x}
          y={y}
          width={previewWidth}
          height={previewHeight}
          color="rgba(176, 224, 230, 0.3)"
        />
        <Rect
          x={x}
          y={y}
          width={previewWidth}
          height={previewHeight}
          color="#4682B4"
          style="stroke"
          strokeWidth={2}
        />
      </Canvas>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Selecione o tipo de documento</Text>
      <View style={styles.optionsContainer}>
        {documentOptions.map(option => (
          <TouchableOpacity
            key={option.type}
            style={styles.optionCard}
            onPress={() => onSelectDocument(option.type)}>
            <DocumentPreview
              type={option.type}
              width={option.width}
              height={option.height}
            />
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDimensions}>{option.dimensions}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 18,
    textAlign: 'center',
    color: '#333',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  previewCanvas: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDimensions: {
    fontSize: 14,
    color: '#666',
  },
});

export default DocumentSelectionScreen;
