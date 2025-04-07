import {SafeAreaView, StatusBar, StyleSheet, Text} from 'react-native';
import React, {useEffect} from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {Canvas, Rect} from '@shopify/react-native-skia';

const App = () => {
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

  const A4Rectangle = () => {
    // Dimensões aproximadas de uma folha A4 em modo retrato (valores arbitrários para visualização)
    const width = 210; // largura
    const height = 297; // altura

    // Offsets para posicionar o retângulo na tela (você pode ajustar conforme necessário)
    const offsetX = 50;
    const offsetY = 50;

    return (
      <Canvas style={styles.canvas}>
        {/* Retângulo com preenchimento azul claro */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={width}
          height={height}
          color="#B0E0E6" // azul claro
        />
        {/* Retângulo para a borda com azul mais forte */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={width}
          height={height}
          color="#4682B4" // azul mais forte
          style="stroke"
          strokeWidth={2}
        />
      </Canvas>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar
        barStyle={'dark-content'}
        translucent={true}
        backgroundColor={'transparent'}
      />
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
      <A4Rectangle />
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
});

export default App;
