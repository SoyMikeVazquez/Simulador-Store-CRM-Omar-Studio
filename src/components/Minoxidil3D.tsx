import React from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MinoxidilSize } from '@/app/page';

export default function Minoxidil3D({ labelUrl, size }: { labelUrl: string, size?: MinoxidilSize }) {
  const labelTex = useTexture(labelUrl);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  
  const scale = size === '30ml' ? 0.8 : 1.0;

  return (
    <group position={[0, -0.6, 0]} scale={[scale, scale, scale]}>
      {/* Bottle Body (Amber Glass) */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.0, 32]} />
        <meshPhysicalMaterial 
          color="#8b4513"
          transmission={0.8} 
          thickness={0.05} 
          roughness={0.1}
          envMapIntensity={2.0}
          clearcoat={1.0}
        />
      </mesh>
      
      {/* Label wrapped around the body */}
      <mesh position={[0, 0.5, 0]} scale={[1.01, 1, 1.01]}>
        <cylinderGeometry args={[0.3, 0.3, 0.7, 32]} />
        <meshStandardMaterial 
          map={labelTex} 
          transparent={true} 
          roughness={0.3} 
        />
      </mesh>
      
      {/* Bottle Neck */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 0.2, 32]} />
        <meshPhysicalMaterial 
          color="#8b4513"
          transmission={0.8} 
          thickness={0.05} 
          roughness={0.1}
        />
      </mesh>
      
      {/* Dropper Cap (Black Plastic) */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      
      {/* Dropper Squeeze Bulb */}
      <mesh position={[0, 1.6, 0]}>
        <capsuleGeometry args={[0.1, 0.1, 4, 16]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
    </group>
  );
}
