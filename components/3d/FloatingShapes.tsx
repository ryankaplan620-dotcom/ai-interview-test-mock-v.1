"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const POINT_COUNT = 500;

function FlowingRibbon() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Lissajous curve parameters that morph over time
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mesh = meshRef.current;
    if (!mesh) return;

    // Slowly morphing frequency parameters
    const freqA = 2.0 + Math.sin(t * 0.1) * 0.5;
    const freqB = 3.0 + Math.cos(t * 0.08) * 0.7;
    const freqC = 1.5 + Math.sin(t * 0.12) * 0.3;

    for (let i = 0; i < POINT_COUNT; i++) {
      const frac = i / POINT_COUNT;
      const angle = frac * Math.PI * 2;

      // Lissajous-like parametric curve
      const x = Math.sin(angle * freqA + t * 0.15) * 3.5;
      const y = Math.sin(angle * freqB + t * 0.12) * 1.0;
      const z = Math.cos(angle * freqC + t * 0.1) * 2.0 - 2.0;

      dummy.position.set(x, y, z);

      // Fade at edges (first 15% and last 15%)
      const edgeFade = Math.min(frac / 0.15, (1 - frac) / 0.15, 1);
      const size = 0.012 + edgeFade * 0.008 + Math.sin(t + i * 0.1) * 0.002;
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POINT_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.15} />
    </instancedMesh>
  );
}

function FloatingShapes() {
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
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: false, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <FlowingRibbon />
    </Canvas>
  );
}

export default FloatingShapes;
