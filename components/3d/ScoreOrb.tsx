"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ORBIT_DOT_COUNT = 24;

function OrbitalDots() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < ORBIT_DOT_COUNT; i++) {
      const frac = i / ORBIT_DOT_COUNT;
      const angle = frac * Math.PI * 2 + t * 0.3;
      const radius = 1.5;

      dummy.position.set(
        radius * Math.cos(angle),
        radius * Math.sin(angle) * Math.sin(Math.PI / 2 + Math.sin(t * 0.3) * 0.1),
        radius * Math.sin(angle) * Math.cos(Math.PI / 2 + Math.sin(t * 0.3) * 0.1)
      );
      dummy.scale.setScalar(0.03 + Math.sin(t * 2 + i) * 0.01);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ORBIT_DOT_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function MainRing() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.2) * 0.08;
    ref.current.rotation.y = t * 0.12;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.5, 0.025, 32, 100]} />
      <meshStandardMaterial
        color="#00DC82"
        metalness={0.1}
        roughness={0.6}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

function BackgroundDisc() {
  const ref = useRef<THREE.Mesh>(null!);

  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color("#00DC82") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * 0.06;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <mesh ref={ref} material={gradientMaterial}>
      <planeGeometry args={[5, 5]} />
    </mesh>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-2, -2, 2]} intensity={0.2} color="#00DC82" />

      <BackgroundDisc />
      <group ref={groupRef}>
        <MainRing />
        <OrbitalDots />
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
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <Scene />
    </Canvas>
  );
}

export default ScoreOrb;
