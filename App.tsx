import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, View, Text, StyleSheet} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {
  Canvas,
  Circle,
  PaintStyle,
  PointMode,
  Skia,
  SkPoint,
  vec,
} from '@shopify/react-native-skia';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {
  OpenCV,
  ColorConversionCodes,
  ObjectType,
  MorphShapes,
  MorphTypes,
  ContourApproximationModes,
  RetrievalModes,
  PointVector,
} from 'react-native-fast-opencv';

const paint = Skia.Paint();
const border = Skia.Paint();

paint.setStyle(PaintStyle.Fill);
paint.setColor(Skia.Color(0x66_e7_a6_49));
border.setStyle(PaintStyle.Fill);
border.setColor(Skia.Color(0xff_e7_a6_49));
border.setStrokeWidth(4);

type Point = {x: number; y: number};

const SkiaFrameProcessorExample = () => {
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const {resize} = useResizePlugin();

  const frameProcessor = useSkiaFrameProcessor(frame => {
    'worklet';

    if (!resize) {
      console.log('Resize plugin not initialized');
      return;
    }

    const ratio = 500 / frame.width;
    const height = frame.height * ratio;
    const width = frame.width * ratio;

    const resized = resize(frame, {
      dataType: 'uint8',
      pixelFormat: 'rgba',
      scale: {
        height: height,
        width: width,
      },
    });

    //
    const source = OpenCV.frameBufferToMat(height, width, 3, resized);

    OpenCV.invoke(
      'cvtColor',
      source,
      source,
      ColorConversionCodes.COLOR_BGR2GRAY,
    );

    const kernel = OpenCV.createObject(ObjectType.Size, 4, 4);
    const blurKernel = OpenCV.createObject(ObjectType.Size, 7, 7);
    const structuringElement = OpenCV.invoke(
      'getStructuringElement',
      MorphShapes.MORPH_ELLIPSE,
      kernel,
    );

    OpenCV.invoke(
      'morphologyEx',
      source,
      source,
      MorphTypes.MORPH_OPEN,
      structuringElement,
    );
    OpenCV.invoke(
      'morphologyEx',
      source,
      source,
      MorphTypes.MORPH_CLOSE,
      structuringElement,
    );
    OpenCV.invoke('GaussianBlur', source, source, blurKernel, 0);
    OpenCV.invoke('Canny', source, source, 75, 100);

    //

    //
    const contours = OpenCV.createObject(ObjectType.PointVectorOfVectors);

    OpenCV.invoke(
      'findContours',
      source,
      contours,
      RetrievalModes.RETR_LIST,
      ContourApproximationModes.CHAIN_APPROX_SIMPLE,
    );

    const contoursMats = OpenCV.toJSValue(contours);
    //

    //
    let greatestPolygon: PointVector | undefined;
    let greatestArea = 0;

    for (let index = 0; index < contoursMats.array.length; index++) {
      const contour = OpenCV.copyObjectFromVector(contours, index);
      const {value: area} = OpenCV.invoke('contourArea', contour, false);

      if (area > 2000 && area > greatestArea) {
        const peri = OpenCV.invoke('arcLength', contour, true);
        const approx = OpenCV.createObject(ObjectType.PointVector);

        OpenCV.invoke('approxPolyDP', contour, approx, 0.1 * peri.value, true);

        greatestPolygon = approx;
        greatestArea = area;
      }
    }

    frame.render();
    //

    //
    if (greatestPolygon) {
      const points: Point[] = OpenCV.toJSValue(greatestPolygon).array;

      if (points.length === 4) {
        const path = Skia.Path.Make();
        const pointsToShow: SkPoint[] = [];

        const lastPointX = points[3].x / ratio;
        const lastPointY = points[3].y / ratio;

        path.moveTo(lastPointX, lastPointY);
        pointsToShow.push(vec(lastPointX, lastPointY));

        for (let index = 0; index < 4; index++) {
          const pointX = points[index].x / ratio;
          const pointY = points[index].y / ratio;

          path.lineTo(pointX, pointY);
          pointsToShow.push(vec(pointX, pointY));
        }

        path.close();

        frame.drawPath(path, paint);
        frame.drawPoints(PointMode.Polygon, pointsToShow, border);
      }
    }

    OpenCV.clearBuffers();
    //
  }, []);

  useEffect(() => {
    requestPermission();
  }, []);

  if (!hasPermission) return <Text>No Permission</Text>;
  if (!device) return <Text>No Device</Text>;

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat='rgb'
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default SkiaFrameProcessorExample;
