"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

/**
 * Voice waveform visualization — represents Folio's voice-first interview practice.
 * Circular waveform bars arranged in a ring, pulsing like an active voice session.
 */
function VoiceVisualization() {
  const groupRef = useRef<THREE.Group>(null!);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const barCount = 64;
  const barRefs = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Smooth rotation following mouse
    groupRef.current.rotation.y += (mouseRef.current.x * 0.3 - groupRef.current.rotation.y) * 0.02;
    groupRef.current.rotation.x += (mouseRef.current.y * 0.15 - groupRef.current.rotation.x) * 0.02;
    groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.05;

    // Animate each bar height like a voice waveform
    for (let i = 0; i < barRefs.current.length; i++) {
      const bar = barRefs.current[i];
      if (!bar) continue;

      // Multiple sine waves for organic voice-like pattern
      const wave1 = Math.sin(t * 2.5 + i * 0.3) * 0.5;
      const wave2 = Math.sin(t * 1.8 + i * 0.5) * 0.3;
      const wave3 = Math.sin(t * 3.2 + i * 0.15) * 0.2;
      const pulse = Math.sin(t * 0.8) * 0.15;

      const height = 0.3 + Math.abs(wave1 + wave2 + wave3 + pulse) * 0.8;
      bar.scale.y = height;
    }
  });

  const bars = useMemo(() => {
    const items = [];
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      items.push(
        <mesh
          key={i}
          ref={(el) => { if (el) barRefs.current[i] = el; }}
          position={[x, 0, z]}
          rotation={[0, -angle + Math.PI / 2, 0]}
        >
          <boxGeometry args={[0.06, 1, 0.06]} />
          <meshStandardMaterial
            color="#00DC82"
            transparent
            opacity={0.7 + (i % 3) * 0.1}
            emissive="#00DC82"
            emissiveIntensity={0.2}
          />
        </mesh>
      );
    }
    return items;
  }, []);

  // Inner ring (microphone representation)
  const innerRingBars = useMemo(() => {
    const items = [];
    const innerCount = 32;
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2;
      const radius = 1.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      items.push(
        <mesh
          key={`inner-${i}`}
          position={[x, 0, z]}
          rotation={[0, -angle + Math.PI / 2, 0]}
        >
          <boxGeometry args={[0.04, 0.4, 0.04]} />
          <meshStandardMaterial
            color="#00DC82"
            transparent
            opacity={0.3}
          />
        </mesh>
      );
    }
    return items;
  }, []);

  return (
    <group ref={groupRef} position={[viewport.width * 0.2, 0, 0]}>
      {/* Outer waveform ring */}
      {bars}

      {/* Inner static ring */}
      {innerRingBars}

      {/* Center sphere (microphone core) */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color="#00DC82"
          transparent
          opacity={0.15}
          emissive="#00DC82"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#00DC82"
          emissive="#00DC82"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Orbit rings */}
      <mesh rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[2.8, 0.008, 16, 100]} />
        <meshBasicMaterial color="#00DC82" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[Math.PI * 0.35, Math.PI * 0.2, 0]}>
        <torusGeometry args={[3.2, 0.005, 16, 100]} />
        <meshBasicMaterial color="#00DC82" transparent opacity={0.08} />
      </mesh>

      {/* Floating particles around the visualization */}
      <FloatingParticles />
    </group>
  );
}

function FloatingParticles() {
  const count = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.5 + Math.random() * 1.5;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      dummy.position.set(
        positions[i3] + Math.sin(t * 0.3 + i) * 0.1,
        positions[i3 + 1] + Math.cos(t * 0.2 + i * 0.5) * 0.1,
        positions[i3 + 2],
      );
      dummy.scale.setScalar(0.02 + Math.sin(t * 0.5 + i) * 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.25} />
    </instancedMesh>
  );
}

export default function HeroScene() {
  const [canRender, setCanRender] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    if (!prefersReduced && !isMobile) setCanRender(true);
  }, []);
  if (!canRender) return null;

  return (
    <Canvas
      className="absolute inset-0 z-0"
      dpr={[1, 1.5]}
      camera={{ position: [0, 1, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color="#00DC82" />
      <pointLight position={[-3, -2, 4]} intensity={0.3} color="#ffffff" />
      <VoiceVisualization />
    </Canvas>
  );
}
