'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import HairWaxJar from './HairWaxJar';
import Minoxidil3D from './Minoxidil3D';
import TexturePowder3D from './TexturePowder3D';
import AfterShave3D from './AfterShave3D';
import ErrorBoundary from './ErrorBoundary';

import { ContainerType, ProductType, MinoxidilSize, PowderSize, AfterShaveSize } from '@/app/page';

interface ThreeCanvasProps {
  productType: ProductType;
  containerType: ContainerType;
  lidLabelUrl: string;
  sideLabelUrl: string;
  hasWax: boolean;
  lidOpen: boolean;
  waxColor: string;
  waxRoughness: number;

  minoxidilSize: MinoxidilSize;
  powderSize: PowderSize;
  afterShaveSize: AfterShaveSize;

  // Scene lighting settings
  envBrightness: number;
  accentLightColor: string;
}

import { Loader } from '@react-three/drei';

export default function ThreeCanvas({
  productType,
  containerType,
  lidLabelUrl,
  sideLabelUrl,
  hasWax,
  lidOpen,
  waxColor,
  waxRoughness,
  minoxidilSize,
  powderSize,
  afterShaveSize,
  envBrightness,
  accentLightColor,
}: ThreeCanvasProps) {
  return (
    <div className="canvasContainer" style={{ width: '100%', height: '100%' }}>
      {/* Viewport Floating Info */}
      <div className="viewportUI">
        <div className="viewportBadge">
          <span className="liveIndicator"></span>
          Estudio de Renderizado Realista
        </div>
      </div>

      <Canvas
        shadows
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          // Force transparency so CSS background is fully visible behind WebGL render buffer
          gl.setClearColor(0x000000, 0);
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.8, 4.2]} fov={40} />
        
        {/* Procedural Studio Environment for photorealistic reflections without external HDR downloads */}
        <Environment resolution={256} environmentIntensity={0.75 * envBrightness}>
          <group rotation={[-Math.PI / 4, 0, 0]}>
            <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, -8]} scale={[12, 12, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={2} color="#eef2f7" position={[-6, 3, -1]} scale={[10, 5, 1]} rotation-y={Math.PI / 2} />
            <Lightformer form="rect" intensity={2} color="#ffffff" position={[6, 3, -1]} scale={[10, 5, 1]} rotation-y={-Math.PI / 2} />
            <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[0, 8, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
          </group>
        </Environment>
        
        {/* Lights Configured with Dynamic User-controlled Brightness */}
        <ambientLight intensity={0.25 * envBrightness} />
        
        {/* Main Key Light (Top-Right-Front) */}
        <spotLight
          position={[6, 8, 6]}
          angle={0.25}
          penumbra={0.8}
          intensity={2.5 * envBrightness}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />
        
        {/* Fill Light (Left-Front) */}
        <directionalLight
          position={[-6, 3, 3]}
          intensity={0.6 * envBrightness}
          color="#a3b8cc"
        />
        
        {/* Strong Rim Light (Back-Top) - Silhouette Highlight */}
        <directionalLight
          position={[0, 6, -6]}
          intensity={3.5 * envBrightness}
          color="#ffffff"
        />

        {/* Sub-rim light (Back-Bottom-Left) */}
        <directionalLight
          position={[-4, -2, -4]}
          intensity={1.2 * envBrightness}
          color="#ffffff"
        />

        {/* Accent reflection light from the side (Dynamic color and brightness!) */}
        <directionalLight
          position={[4, -1, 3]}
          intensity={0.5 * envBrightness}
          color={accentLightColor}
        />

        {/* 3D Model with dynamic props wrapped in Suspense */}
        <ErrorBoundary>
          <Suspense fallback={null}>
            {productType === 'wax' ? (
              <group position={[0, -0.2, 0]}>
                <HairWaxJar
                  containerType={containerType}
                  lidLabelUrl={lidLabelUrl}
                  sideLabelUrl={sideLabelUrl}
                  hasWax={hasWax}
                  lidOpen={lidOpen}
                  waxColor={waxColor}
                  waxRoughness={waxRoughness}
                />
              </group>
            ) : productType === 'minoxidil' ? (
              <group position={[0, 0, 0]}>
                <Minoxidil3D labelUrl={sideLabelUrl} size={minoxidilSize} />
              </group>
            ) : productType === 'texture_powder' ? (
              <group position={[0, 0, 0]}>
                <TexturePowder3D labelUrl={sideLabelUrl} size={powderSize} />
              </group>
            ) : (
              <group position={[0, 0, 0]}>
                <AfterShave3D labelUrl={sideLabelUrl} size={afterShaveSize} />
              </group>
            )}
          </Suspense>
        </ErrorBoundary>

        {/* Realistic Floor Shadow */}
        <ContactShadows
          position={[0, -0.81, 0]}
          opacity={0.65}
          scale={6.5}
          blur={2.0}
          far={1.4}
          resolution={512}
        />

        {/* Smooth Orbit controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={2.2}
          maxDistance={7}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={true}
          autoRotateSpeed={1.0}
        />
      </Canvas>

      {/* Global Loading Overlay for textures/models */}
      <Loader 
        containerStyles={{ background: 'rgba(3, 3, 3, 0.85)', backdropFilter: 'blur(10px)' }}
        innerStyles={{ width: '200px' }}
        barStyles={{ background: '#d4af37', height: '3px' }}
        dataInterpolation={(p) => `Cargando Texturas ${p.toFixed(0)}%`}
        dataStyles={{ color: '#d4af37', fontSize: '0.8rem', letterSpacing: '0.1em', fontWeight: 'bold', textTransform: 'uppercase' }}
      />
    </div>
  );
}
