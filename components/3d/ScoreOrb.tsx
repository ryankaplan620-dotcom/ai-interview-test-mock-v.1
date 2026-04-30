"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ORB_PARTICLE_COUNT = 200;

function OrbParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const restPositions = useMemo(() => {
    const positions = new Float32Array(ORB_PARTICLE_COUNT * 3);
    for (let i = 0; i < ORB_PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.2 + Math.random() * 0.8; // orbit between 1.2 and 2.0
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  const speeds = useMemo(() => {
    const s = new Float32Array(ORB_PARTICLE_COUNT);
    for (let i = 0; i < ORB_PARTICLE_COUNT; i++) {
      s[i] = 0.1 + Math.random() * 0.3;
    }
    return s;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = clock.getElapsedTime();

    for (let i = 0; i < ORB_PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const speed = speeds[i];

      // Orbit around center with slight drift
      const angle = t * speed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const x = restPositions[i3];
      const z = restPositions[i3 + 2];

      dummy.position.set(
        x * cosA - z * sinA,
        restPositions[i3 + 1] + Math.sin(t * 0.5 + i) * 0.05,
        x * sinA + z * cosA
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ORB_PARTICLE_COUNT]}>
      <sphereGeometry args={[0.015, 4, 4]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.5} />
    </instancedMesh>
  );
}

function OrbitRing() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.1;
    ref.current.rotation.z = t * 0.2;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.5, 0.01, 8, 64]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.3} />
    </mesh>
  );
}

function MainSphere({ hovered }: { hovered: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const scale = useRef(1);

  useFrame(() => {
    const targetScale = hovered ? 1.1 : 1;
    scale.current += (targetScale - scale.current) * 0.05;

    if (ref.current) {
      ref.current.scale.setScalar(scale.current);
    }
    if (wireframeRef.current) {
      wireframeRef.current.scale.setScalar(scale.current * 1.02);
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#00DC82"
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh ref={wireframeRef}>
        <sphereGeometry args={[0.82, 16, 16]} />
        <meshBasicMaterial
          color="#00DC82"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
    </>
  );
}

function Scene() {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const handlePointerOver = useCallback(() => setHovered(true), []);
  const handlePointerOut = useCallback(() => setHovered(false), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.15;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-2, -2, 2]} intensity={0.3} color="#00DC82" />

      <group
        ref={groupRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <MainSphere hovered={hovered} />
        <OrbitRing />
        <OrbParticles />
      </group>
    </>
  );
}

function ScoreOrb() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.innerWidth < 768;

    if (!prefersReduced && !isMobile) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <Canvas
      className="absolute inset-0 z-0"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4], fov: 50 }}
      gl={{ antialias: false, alpha: true }}
      style={{ pointerEvents: "auto" }}
    >
      <Scene />
    </Canvas>
  );
}

export default ScoreOrb;
