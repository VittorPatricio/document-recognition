'use client';

import {useState, useRef, useEffect} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  Dimensions,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import {Canvas, Rect} from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import type {DocumentType} from '../App';
import React from 'react';

type CameraScreenProps = {
  documentType: DocumentType;
  onBack: () => void;
};

const CameraScreen = ({documentType, onBack}: CameraScreenProps) => {
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // 1) Solicita permissão assim que o componente monta
  useEffect(() => {
    (async () => {
      await requestPermission();
    })();
  }, [requestPermission]);

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Precisamos de permissão para usar a câmera</Text>
      </SafeAreaView>
    );
  }
  if (!device) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Dispositivo de câmera não encontrado.</Text>
      </SafeAreaView>
    );
  }

  // 2) Frame de auxílio via Skia
  const DocumentFrame = () => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    let w, h;
    switch (documentType) {
      case 'A4':
        w = 210;
        h = 297;
        break;
      case 'RG':
        w = 96;
        h = 65;
        break;
      case 'CPF':
        w = 66;
        h = 99;
        break;
      case 'CNH':
        w = 85;
        h = 60;
        break;
      default:
        w = 210;
        h = 297;
    }
    const ratio = w / h;
    const M = 40;
    const availW = screenWidth - M * 2;
    const availH = screenHeight - M * 2;
    let rectW, rectH;
    if (availW / availH < ratio) {
      rectW = availW;
      rectH = rectW / ratio;
    } else {
      rectH = availH;
      rectW = rectH * ratio;
    }
    const x = (screenWidth - rectW) / 2;
    const y = (screenHeight - rectH) / 2.35;
    const corner = 20;

    return (
      <Canvas style={styles.canvas}>
        <Rect
          x={x}
          y={y}
          width={rectW}
          height={rectH}
          color="rgba(176,224,230,0.3)"
        />
        <Rect
          x={x}
          y={y}
          width={rectW}
          height={rectH}
          color="#4682B4"
          style="stroke"
          strokeWidth={3}
        />
        {/* marcadores de canto */}
        {/* TL */}
        <Rect x={x} y={y} width={corner} height={3} color="#4682B4" />
        <Rect x={x} y={y} width={3} height={corner} color="#4682B4" />
        {/* TR */}
        <Rect
          x={x + rectW - corner}
          y={y}
          width={corner}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x + rectW - 3}
          y={y}
          width={3}
          height={corner}
          color="#4682B4"
        />
        {/* BL */}
        <Rect
          x={x}
          y={y + rectH - 3}
          width={corner}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x}
          y={y + rectH - corner}
          width={3}
          height={corner}
          color="#4682B4"
        />
        {/* BR */}
        <Rect
          x={x + rectW - corner}
          y={y + rectH - 3}
          width={corner}
          height={3}
          color="#4682B4"
        />
        <Rect
          x={x + rectW - 3}
          y={y + rectH - corner}
          width={3}
          height={corner}
          color="#4682B4"
        />
      </Canvas>
    );
  };

  // 3) Captura e envio
  const takePhotoAndUpload = async () => {
    if (!cameraRef.current || !isCameraActive) return;

    try {
      setError(null);

      // Capture photo
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      // Deactivate camera to prevent "already in use" error
      setIsCameraActive(false);

      // Set photo URI with file:// prefix for proper display
      const fullPhotoUri = 'file://' + photo.path;
      setPhotoUri(fullPhotoUri);
      setIsLoading(true);

      console.log('Photo captured:', fullPhotoUri);

      // Method 1: Using FormData with binary file
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', {
        uri: fullPhotoUri,
        type: 'image/jpeg',
        name: 'document.jpg',
      } as any);

      console.log('Sending request to API...');
      console.log('Document type:', documentType);

      try {
        // First attempt with FormData
        const response = await fetch(
          'https://workflow.wpp.accesys.com.br/webhook-test/documento/analise',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data',
              Accept: 'application/json',
            },
            body: formData,
          },
        );

        if (response.ok) {
          const responseData = await response.json();
          setApiResponse(responseData);
          console.log('API Response:', responseData);
        } else {
          console.log('API Error Status:', response.status);
          const errorText = await response.text();
          console.log('API Error:', errorText);

          // If FormData approach fails, try with binary data
          await sendBinaryData(photo.path, documentType);
        }
      } catch (formDataError) {
        console.error('FormData approach failed:', formDataError);
        // Fallback to binary approach
        await sendBinaryData(photo.path, documentType);
      }
    } catch (err) {
      console.error('Error capturing or uploading photo:', err);
      setError(
        'Erro ao capturar ou enviar a foto: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Binary data approach as fallback
  const sendBinaryData = async (imagePath: string, docType: DocumentType) => {
    try {
      // Read file as binary
      const imageBuffer = await RNFS.readFile(imagePath, 'base64');

      // Convert base64 to binary
      const binaryData = Buffer.from(imageBuffer, 'base64');

      // Construct URL with query parameter
      const url = `https://workflow.wpp.accesys.com.br/webhook-test/documento/analise?documentType=${docType}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          Accept: 'application/json',
        },
        body: binaryData,
      });

      if (response.ok) {
        const responseData = await response.json();
        setApiResponse(responseData);
        console.log('Binary API Response:', responseData);
      } else {
        const errorText = await response.text();
        console.log('Binary API Error:', response.status, errorText);
        setError(`Erro na API (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error('Binary upload failed:', err);
      setError(
        'Erro ao enviar dados binários: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const retakePhoto = () => {
    setPhotoUri(null);
    setApiResponse(null);
    setError(null);
    // Re-activate camera
    setIsCameraActive(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {!photoUri ? (
        <>
          {isCameraActive && (
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isCameraActive}
              photo={true}
            />
          )}
          <DocumentFrame />
        </>
      ) : (
        <Image source={{uri: photoUri}} style={styles.previewImage} />
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Processando documento...</Text>
        </View>
      )}

      {/* Botões de ação */}
      <View style={styles.buttonContainer}>
        {!photoUri ? (
          <TouchableOpacity
            style={styles.captureButtonLayer}
            onPress={takePhotoAndUpload}
            disabled={!isCameraActive || isLoading}>
            <View style={styles.captureButton} />
          </TouchableOpacity>
        ) : !isLoading && !apiResponse && !error ? (
          <View style={styles.photoActionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={retakePhoto}>
              <Text style={styles.actionButtonText}>Tirar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Botão Voltar */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          // Ensure camera is deactivated before navigating back
          setIsCameraActive(false);
          onBack();
        }}>
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

      {/* Mostrar resposta da API */}
      {apiResponse && (
        <View style={styles.responseBox}>
          <Text style={styles.responseTitle}>Resposta da API:</Text>
          <ScrollView style={styles.responseScroll}>
            <Text style={styles.responseText}>
              {JSON.stringify(apiResponse, null, 2)}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={retakePhoto}>
            <Text style={styles.closeButtonText}>Nova foto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mostrar erro */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Erro:</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={retakePhoto}>
            <Text style={styles.closeButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  canvas: {flex: 1},
  previewImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: '7.5%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#fff',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonLayer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },
  actionButton: {
    backgroundColor: '#4682B4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 21,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -8.25,
  },
  documentTypeContainer: {
    position: 'absolute',
    top: 25,
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
  responseBox: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 10,
    maxHeight: '40%',
    elevation: 5,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  responseScroll: {
    maxHeight: 150,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
  },
  errorBox: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,200,200,0.9)',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#C00',
  },
  errorText: {
    fontSize: 14,
    color: '#800',
  },
  closeButton: {
    backgroundColor: '#4682B4',
    padding: 10,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CameraScreen;
