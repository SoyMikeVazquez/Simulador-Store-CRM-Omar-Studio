'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SidebarControls from '@/components/SidebarControls';

const ThreeCanvas = dynamic(() => import('@/components/ThreeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="loadingOverlay">
      <div className="spinner"></div>
      <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: '600' }}>
        Cargando Motor 3D
      </h2>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Preparando texturas fotorrealistas...</span>
    </div>
  )
});

export type ContainerType = 'alum_black_150' | 'alum_black_250' | 'alum_silver_150' | 'alum_silver_250' | 'pet_clear_150' | 'pet_clear_250';
export type ProductType = 'wax' | 'minoxidil' | 'texture_powder' | 'after_shave';
export type MinoxidilSize = '50ml' | '30ml';
export type PowderSize = '80g' | '40g';
export type AfterShaveSize = '500ml' | '250ml';

export default function Home() {

  
  // Multi-product selector state
  const [productType, setProductType] = useState<ProductType>('wax');
  const [containerType, setContainerType] = useState<ContainerType>('alum_black_150');

  const [lidLabelUrl, setLidLabelUrl] = useState('./default_label.png');
  const [sideLabelUrl, setSideLabelUrl] = useState('./default_side_label.png');
  
  // Sizes for new products
  const [minoxidilSize, setMinoxidilSize] = useState<MinoxidilSize>('50ml');
  const [powderSize, setPowderSize] = useState<PowderSize>('80g');
  const [afterShaveSize, setAfterShaveSize] = useState<AfterShaveSize>('500ml');
  
  // Wax hair jar customizer state
  const [hasWax, setHasWax] = useState<boolean>(false); // Default empty container
  const [lidOpen, setLidOpen] = useState<boolean>(false);
  const [waxColor, setWaxColor] = useState<string>('#f3f4f6');
  const [waxRoughness, setWaxRoughness] = useState<number>(0.4);

  // Spray can customizer state
  const [canFinish, setCanFinish] = useState<'glossy' | 'matte' | 'brushed'>('matte');
  const [shoulderFinish, setShoulderFinish] = useState<'silver' | 'gold' | 'black'>('silver');
  const [nozzleColor, setNozzleColor] = useState<'black' | 'white' | 'red'>('black');
  const [isSpraying, setIsSpraying] = useState<boolean>(false);

  // Scene lighting customization states
  const [envBrightness, setEnvBrightness] = useState<number>(1.0);
  const [accentLightColor, setAccentLightColor] = useState<string>('#e5c158'); // Default gold



  return (
    <main className="appContainer">


      {/* 3D Canvas Viewport (Left/Top) */}
      <ThreeCanvas
        productType={productType}
        containerType={containerType}
        lidLabelUrl={lidLabelUrl}
        sideLabelUrl={sideLabelUrl}
        hasWax={hasWax}
        lidOpen={lidOpen}
        waxColor={waxColor}
        waxRoughness={waxRoughness}
        minoxidilSize={minoxidilSize}
        powderSize={powderSize}
        afterShaveSize={afterShaveSize}
        envBrightness={envBrightness}
        accentLightColor={accentLightColor}
      />

      {/* Editor Controls Panel (Right/Bottom) */}
      <SidebarControls
        productType={productType}
        setProductType={setProductType}
        containerType={containerType}
        setContainerType={setContainerType}
        lidLabelUrl={lidLabelUrl}
        setLidLabelUrl={setLidLabelUrl}
        sideLabelUrl={sideLabelUrl}
        setSideLabelUrl={setSideLabelUrl}
        hasWax={hasWax}
        setHasWax={setHasWax}
        lidOpen={lidOpen}
        setLidOpen={setLidOpen}
        waxColor={waxColor}
        setWaxColor={setWaxColor}
        waxRoughness={waxRoughness}
        setWaxRoughness={setWaxRoughness}
        minoxidilSize={minoxidilSize}
        setMinoxidilSize={setMinoxidilSize}
        powderSize={powderSize}
        setPowderSize={setPowderSize}
        afterShaveSize={afterShaveSize}
        setAfterShaveSize={setAfterShaveSize}
        envBrightness={envBrightness}
        setEnvBrightness={setEnvBrightness}
        accentLightColor={accentLightColor}
        setAccentLightColor={setAccentLightColor}
      />
    </main>
  );
}
