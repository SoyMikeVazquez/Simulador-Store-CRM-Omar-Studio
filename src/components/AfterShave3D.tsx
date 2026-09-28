import React from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { AfterShaveSize } from '@/app/page';

export default function AfterShave3D({ labelUrl, size }: { labelUrl: string, size?: AfterShaveSize }) {
  const labelTex = useTexture(labelUrl);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  
  const scale = size === '250ml' ? 0.75 : 1.0;

  return (
    <group position={[0, -0.6, 0]} scale={[scale, scale, scale]}>
      {/* Bottle Body (Clear Plastic) */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transmission={0.95} 
          thickness={0.05} 
          roughness={0.05}
          envMapIntensity={2.0}
        />
      </mesh>
      
      {/* Label */}
      <mesh position={[0, 0.5, 0]} scale={[1.01, 1, 1.01]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8, 32]} />
        <meshStandardMaterial 
          map={labelTex} 
          transparent={true} 
          roughness={0.3} 
        />
      </mesh>
      
      {/* Bottle Shoulder */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.1, 0.25, 0.1, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transmission={0.95} 
          thickness={0.05} 
          roughness={0.05}
        />
      </mesh>

      {/* Spray Top Cap/Pump (Black/Silver) */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
      </mesh>
      
      {/* Nozzle/Clear cap (optional) */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.3, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transmission={0.9} 
          thickness={0.02} 
          roughness={0.1}
          transparent={true}
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
