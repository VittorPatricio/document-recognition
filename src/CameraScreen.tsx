'use client';

import {useState, useRef, useEffect, useCallback} from 'react';
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
  Platform,
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
  const cameraRef = useRef<Camera | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    const requestCameraPermission = async () => {
      await requestPermission();
    };
    requestCameraPermission();

    // Cleanup function to ensure camera is released
    return () => {
      setIsCameraActive(false);
      cameraRef.current = null;
    };
  }, [requestPermission]);

  // Handle back button - ensure camera is deactivated
  const handleBack = useCallback(() => {
    setIsCameraActive(false);
    setTimeout(() => {
      onBack();
    }, 300); // Give time for camera to fully release
  }, [onBack]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !isCameraActive || isTakingPhoto || isLoading) {
      console.log(
        'Cannot take photo: Camera not ready or already taking photo',
      );
      return;
    }

    try {
      setIsTakingPhoto(true);
      setError(null);

      console.log('Taking photo...');
      const photo = await cameraRef.current.takePhoto();

      console.log('Photo taken successfully:', photo.path);

      // Deactivate camera AFTER taking photo, not before
      setIsCameraActive(false);

      // Set photo URI with file:// prefix for proper display
      const fullPhotoUri =
        Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;
      setPhotoUri(fullPhotoUri);

      // Process the photo
      await processPhoto(photo.path);
    } catch (err) {
      console.error('Error taking photo:', err);
      setError(
        `Erro ao capturar foto: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Try to recover camera
      setIsCameraActive(false);
      setTimeout(() => {
        setIsCameraActive(true);
      }, 1000); // Increase timeout to 1000ms
    } finally {
      setIsTakingPhoto(false);
    }
  }, [isCameraActive, isTakingPhoto, isLoading]);

  // Process and upload the photo
  const processPhoto = async (photoPath: string) => {
    try {
      setIsLoading(true);
      console.log('Processing photo:', photoPath);

      // Try FormData approach first
      await uploadWithFormData(photoPath);
    } catch (err) {
      console.error('Error processing photo:', err);
      setError(
        `Erro ao processar foto: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Upload using FormData
  const uploadWithFormData = async (photoPath: string) => {
    try {
      console.log('Uploading with FormData...');

      const fullPhotoUri =
        Platform.OS === 'ios' ? photoPath : `file://${photoPath}`;

      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', {
        uri: fullPhotoUri,
        type: 'image/jpeg',
        name: 'document.jpg',
      } as any);

      console.log('Sending request to API with document type:', documentType);

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

        // Try binary upload as fallback
        await uploadBinary(photoPath);
      }
    } catch (err) {
      console.error('FormData upload failed:', err);
      // Try binary upload as fallback
      await uploadBinary(photoPath);
    }
  };

  // Upload using binary data
  const uploadBinary = async (photoPath: string) => {
    try {
      console.log('Uploading with binary data...');

      // Read file as binary
      const imageBuffer = await RNFS.readFile(photoPath, 'base64');

      // Convert base64 to binary
      const binaryData = Buffer.from(imageBuffer, 'base64');

      // Construct URL with query parameter
      const url = `https://workflow.wpp.accesys.com.br/webhook-test/documento/analise?documentType=${documentType}`;

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
        `Erro ao enviar dados binários: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  // Reset state to take another photo
  const retakePhoto = useCallback(() => {
    setPhotoUri(null);
    setApiResponse(null);
    setError(null);

    // Delay camera activation to ensure previous instance is fully released
    setTimeout(() => {
      setIsCameraActive(true);
    }, 1000);
  }, []);

  // Render loading screen
  if (!device || hasPermission === false) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>
          {!device
            ? 'Dispositivo de câmera não encontrado.'
            : 'Precisamos de permissão para usar a câmera'}
        </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {/* Camera or Photo Preview */}
      {!photoUri ? (
        <>
          {!photoUri && isCameraActive && (
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={true}
              photoQualityBalance="speed"
            />
          )}
          {isCameraActive && <DocumentFrame />}
        </>
      ) : (
        <Image source={{uri: photoUri}} style={styles.previewImage} />
      )}

      {/* Loading Overlay */}
      {(isLoading || isTakingPhoto) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {isTakingPhoto ? 'Capturando foto...' : 'Processando documento...'}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!photoUri && !isTakingPhoto ? (
          <TouchableOpacity
            style={[
              styles.captureButtonLayer,
              (!isCameraActive || isTakingPhoto || isLoading) &&
                styles.disabledButton,
            ]}
            onPress={takePhoto}
            disabled={!isCameraActive || isTakingPhoto || isLoading}>
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

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={isTakingPhoto || isLoading}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Document Type Indicator */}
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

      {/* API Response Display */}
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

      {/* Error Display */}
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
  disabledButton: {
    opacity: 0.5,
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
