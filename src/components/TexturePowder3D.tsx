import React from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PowderSize } from '@/app/page';

export default function TexturePowder3D({ labelUrl, size }: { labelUrl: string, size?: PowderSize }) {
  const labelTex = useTexture(labelUrl);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  
  const heightScale = size === '40g' ? 0.65 : 1.0;

  return (
    <group position={[0, -0.6, 0]} scale={[1, heightScale, 1]}>
      {/* Main Body */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 1.0, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      
      {/* Label */}
      <mesh position={[0, 0.5, 0]} scale={[1.01, 1, 1.01]}>
        <cylinderGeometry args={[0.35, 0.35, 0.8, 32]} />
        <meshStandardMaterial 
          map={labelTex} 
          transparent={true} 
          roughness={0.6} 
        />
      </mesh>
      
      {/* Lid */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.5} />
      </mesh>
    </group>
  );
}
