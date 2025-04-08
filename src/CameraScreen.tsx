import React, {useState, useRef, useEffect} from 'react';
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
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import {Canvas, Rect} from '@shopify/react-native-skia';
import type {DocumentType} from '../App';

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
      case 'CPF':
        w = 65;
        h = 90;
        break;
      case 'CNH':
        w = 55;
        h = 75;
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
    if (!cameraRef.current) return;
    try {
      // captura
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
      });
      setPhotoUri(photo.path);

      // prepara FormData
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', {
        uri: photo.path,
        type: 'image/jpeg',
        name: 'document.jpg',
      } as any);

      setIsLoading(true);
      const resp = await fetch(
        'https://workflow.wpp.accesys.com.br/webhook-test/documento/analise',
        {
          method: 'POST',
          headers: {'Content-Type': 'multipart/form-data'},
          body: formData,
        },
      );
      const json = await resp.json();
      setApiResponse(json);
    } catch (err) {
      console.error('Erro ao tirar/upload foto:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
      />
      <DocumentFrame />

      {photoUri && (
        <Image source={{uri: photoUri}} style={styles.previewImage} />
      )}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Botão Tirar Foto */}
      <TouchableOpacity
        style={styles.captureButtonLayer}
        onPress={takePhotoAndUpload}>
        <View style={styles.captureButton} />
      </TouchableOpacity>

      {/* Botão Voltar */}
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

      {/* (Opcional) Mostrar resposta da API */}
      {apiResponse && (
        <View style={styles.responseBox}>
          <Text>Resposta da API:</Text>
          <Text>{JSON.stringify(apiResponse)}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    position: 'absolute',
    bottom: 7.25,
    alignSelf: 'center',
    backgroundColor: '#fff',
    width: 85,
    height: 85,
    borderRadius: 55,
    zIndex: 2,
  },
  captureButtonLayer: {
    position: 'absolute',
    bottom: '8.25%',
    alignSelf: 'center',
    backgroundColor: '#333',
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1,
  },
  buttonText: {color: '#fff', fontWeight: 'bold'},
  backButton: {
    position: 'absolute',
    top: 24,
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
  responseBox: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 8,
  },

  documentTypeContainer: {
    position: 'absolute',
    top: 30,
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
