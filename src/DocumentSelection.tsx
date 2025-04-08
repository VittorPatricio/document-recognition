import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList, DocumentType} from '../App';
import {Canvas, Rect} from '@shopify/react-native-skia';
import React from 'react';

type DocumentSelectionScreenProps = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    'DocumentSelection'
  >;
};

type DocumentOption = {
  type: DocumentType;
  title: string;
  dimensions: string;
  width: number;
  height: number;
};

const DocumentSelectionScreen = ({
  navigation,
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

  const handleSelectDocument = (documentType: DocumentType) => {
    navigation.navigate('Camera', {documentType});
  };

  const DocumentPreview = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    const SCALE_FACTOR = 0.7;
    const previewWidth = width * SCALE_FACTOR;
    const previewHeight = height * SCALE_FACTOR;

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
            onPress={() => handleSelectDocument(option.type)}>
            <DocumentPreview width={option.width} height={option.height} />
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
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
