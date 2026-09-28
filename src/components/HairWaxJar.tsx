'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ContainerType } from '@/app/page';

interface HairWaxJarProps {
  containerType: ContainerType;
  lidLabelUrl: string;
  sideLabelUrl: string;
  hasWax?: boolean;
  lidOpen: boolean;
  waxColor: string;
  waxRoughness: number;
}

export default function HairWaxJar({
  containerType = 'alum_black_150',
  lidLabelUrl,
  sideLabelUrl,
  hasWax = false,
  lidOpen,
  waxColor,
  waxRoughness,
}: HairWaxJarProps) {
  const lidRef = useRef<THREE.Group>(null);
  const jarRef = useRef<THREE.Group>(null);
  
  // Load textures with optimized sampling
  const lidTexture = useTexture(lidLabelUrl);
  lidTexture.colorSpace = THREE.SRGBColorSpace;
  lidTexture.minFilter = THREE.LinearMipmapLinearFilter;
  
  const sideTexture = useTexture(sideLabelUrl);
  sideTexture.colorSpace = THREE.SRGBColorSpace;
  sideTexture.wrapS = THREE.RepeatWrapping;
  sideTexture.wrapT = THREE.ClampToEdgeWrapping;
  sideTexture.minFilter = THREE.LinearMipmapLinearFilter;

  // Geometry dimensions per container type
  const is250g = containerType.endsWith('_250');
  const isPET = containerType.startsWith('pet_');
  const isAlumBlack = containerType.startsWith('alum_black');

  const radius = is250g ? 1.58 : 1.48;
  const height = is250g ? 1.45 : 0.95;
  
  // Closed lid position: bottom of lid aligns with the shoulder lip
  const closedLidY = height / 2 - 0.09;

  // Procedural Bump Map for the lid rim notches (muescas punteadas superiores) and vertical grip
  const notchTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Neutral gray background for bump map (no height displacement)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 2048, 256);

    const numNotches = 160;
    const step = 2048 / numNotches;

    for (let i = 0; i < numNotches; i++) {
      const x = i * step + step / 2;
      
      // Vertical knurling groove (white = embossed highlight)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2.5, 45, 5, 180);

      // Dark indent shadow next to groove for deep 3D effect
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 2.5, 45, 3, 180);

      // Top edge muesca / dot head (white dot with dark shadow ring)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, 40, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x + 2, 42, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Reusable Vector/Euler targets to prevent GC pauses during animation loop
  const targetPos = useMemo(() => {
    return lidOpen 
      ? new THREE.Vector3(radius * 1.8, 0.08, radius * 0.9)
      : new THREE.Vector3(0, closedLidY, 0);
  }, [lidOpen, radius, closedLidY]);
    
  const targetRot = useMemo(() => {
    return lidOpen 
      ? new THREE.Euler(0.35, -0.4, 0.2)
      : new THREE.Euler(0, 0, 0);
  }, [lidOpen]);

  useFrame((state) => {
    if (lidRef.current) {
      lidRef.current.position.lerp(targetPos, 0.12);
      lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, targetRot.x, 0.12);
      lidRef.current.rotation.y = THREE.MathUtils.lerp(lidRef.current.rotation.y, targetRot.y, 0.12);
      lidRef.current.rotation.z = THREE.MathUtils.lerp(lidRef.current.rotation.z, targetRot.z, 0.12);
    }

    if (jarRef.current && !lidOpen) {
      jarRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    } else if (jarRef.current) {
      jarRef.current.rotation.y = THREE.MathUtils.lerp(jarRef.current.rotation.y, 0, 0.08);
    }
  });

  // Base Jar materials based on selection
  const getJarMaterial = () => {
    if (isPET) {
      return (
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          metalness={0.0}
          transmission={0.96}
          opacity={1.0}
          transparent={true}
          ior={1.54}
          thickness={0.45}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          side={THREE.FrontSide}
        />
      );
    }
    if (isAlumBlack) {
      return (
        <meshStandardMaterial
          color="#18181a"
          roughness={0.35}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      );
    }
    // Bright light silver aluminum (plata claro metálico fotorrealista)
    return (
      <meshStandardMaterial
        color="#d8dfe6"
        roughness={0.22}
        metalness={0.45}
        side={THREE.DoubleSide}
      />
    );
  };

  // Lid materials based on selection
  const getLidMaterial = () => {
    if (isPET) {
      return (
        <meshPhysicalMaterial
          color="#101010"
          roughness={0.14}
          metalness={0.05}
          clearcoat={0.9}
          clearcoatRoughness={0.08}
        />
      );
    }
    if (isAlumBlack) {
      return (
        <meshStandardMaterial
          color="#181819"
          roughness={0.3}
          metalness={0.85}
        />
      );
    }
    // Bright light silver lid
    return (
      <meshStandardMaterial
        color="#d8dfe6"
        roughness={0.2}
        metalness={0.45}
      />
    );
  };

  const isCream = waxColor === '#f3f4f6' || waxColor === '#ffffff';

  return (
    <group ref={jarRef}>
      {/* 1. Main Jar Body Base */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
        {getJarMaterial()}
      </mesh>

      {/* Jar Bottom Beveled Rolled Rim */}
      <mesh position={[0, -height / 2 + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.015, 0.015, 24, 64]} />
        {getJarMaterial()}
      </mesh>

      {/* Jar Bottom Cap */}
      <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, radius - 0.015, 64]} />
        {getJarMaterial()}
      </mesh>

      {/* Jar Neck Details for Aluminum Tins (Screw Threads & Shoulder Lip) */}
      {!isPET && (
        <>
          {/* Upper Screw Thread Ring */}
          <mesh position={[0, height / 2 - 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius + 0.003, 0.014, 16, 64]} />
            {isAlumBlack ? (
              <meshStandardMaterial color="#e2e6eb" roughness={0.2} metalness={0.96} />
            ) : (
              getJarMaterial()
            )}
          </mesh>

          {/* Lower Screw Thread Ring */}
          <mesh position={[0, height / 2 - 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius + 0.003, 0.014, 16, 64]} />
            {isAlumBlack ? (
              <meshStandardMaterial color="#e2e6eb" roughness={0.2} metalness={0.96} />
            ) : (
              getJarMaterial()
            )}
          </mesh>

          {/* Outward Rolled Shoulder Lip (where lid rests) */}
          <mesh position={[0, height / 2 - 0.20, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius + 0.008, 0.016, 16, 64]} />
            {getJarMaterial()}
          </mesh>
        </>
      )}

      {/* Silver Interior Wall for Black Aluminum Container (only visible when EMPTY and lid open) */}
      {isAlumBlack && lidOpen && !hasWax && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[radius - 0.03, radius - 0.03, height - 0.02, 48, 1, true]} />
          <meshStandardMaterial color="#e4e8ec" roughness={0.22} metalness={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2. Side Label */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry
          args={[radius + 0.006, radius + 0.006, height * 0.65, 64, 1, true, -Math.PI / 1.5, Math.PI * 1.33]}
        />
        <meshStandardMaterial
          map={sideTexture}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
          transparent={true}
        />
      </mesh>

      {/* 3. Hair Wax / Content inside (Fills container up to near rim) */}
      {hasWax && (lidOpen || isPET) && (
        <group position={[0, isPET ? 0 : 0.02, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[radius - 0.035, radius - 0.05, isPET ? height - 0.08 : height * 0.82, 48]} />
            <meshPhysicalMaterial
              color={waxColor}
              roughness={isCream ? 0.85 : 0.2}
              metalness={0.0}
              clearcoat={isCream ? 0.0 : 1.0}
              clearcoatRoughness={0.1}
            />
          </mesh>
        </group>
      )}

      {/* 4. Jar Lid Group (animated position) */}
      <group ref={lidRef} position={[0, closedLidY, 0]}>
        {/* Main Lid Skirt */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[radius + 0.03, radius + 0.03, 0.21, 64]} />
          {getLidMaterial()}
        </mesh>

        {/* Fine Ridged Knurling Band with Embossed Notches (Muescas punteadas superiores) */}
        {!isPET && (
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[radius + 0.033, radius + 0.033, 0.13, 96, 1, true]} />
            <meshStandardMaterial
              color={isAlumBlack ? "#202023" : "#d0d7e0"}
              roughness={0.25}
              metalness={isAlumBlack ? 0.8 : 0.45}
              bumpMap={notchTexture || undefined}
              bumpScale={0.02}
            />
          </mesh>
        )}

        {/* Top Edge Notched Bead Ring (Muescas punteadas en el borde superior de la tapa) */}
        {!isPET && (
          <mesh position={[0, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius + 0.031, 0.01, 16, 120]} />
            <meshStandardMaterial
              color={isAlumBlack ? "#222225" : "#cdd4dc"}
              roughness={0.25}
              metalness={isAlumBlack ? 0.8 : 0.45}
              bumpMap={notchTexture || undefined}
              bumpScale={0.025}
            />
          </mesh>
        )}

        {/* Lid Bottom Outward Rolled Bead Rim */}
        {!isPET && (
          <mesh position={[0, -0.105, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius + 0.031, 0.012, 16, 64]} />
            {getLidMaterial()}
          </mesh>
        )}

        {/* Lid Top Soft Rounded Bevel */}
        <mesh castShadow position={[0, 0.11, 0]}>
          <cylinderGeometry args={[radius + 0.01, radius + 0.03, 0.03, 64]} />
          {getLidMaterial()}
        </mesh>

        <mesh position={[0, 0.126, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius + 0.02, 64]} />
          <meshStandardMaterial
            map={lidTexture}
            roughness={0.45}
            metalness={0.05}
            side={THREE.DoubleSide}
            transparent={true}
          />
        </mesh>
      </group>
    </group>
  );
}
