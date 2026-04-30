"use client";

import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

interface ShapeConfig {
  geometry: "icosahedron" | "octahedron" | "torusKnot";
  position: [number, number, number];
  size: number;
  rotationSpeed: [number, number, number];
  floatSpeed: number;
  floatIntensity: number;
}

const shapes: ShapeConfig[] = [
  {
    geometry: "icosahedron",
    position: [-4, 0.5, -2],
    size: 0.5,
    rotationSpeed: [0.003, 0.005, 0.002],
    floatSpeed: 1.2,
    floatIntensity: 0.8,
  },
  {
    geometry: "octahedron",
    position: [-1.5, -0.3, -1],
    size: 0.35,
    rotationSpeed: [0.004, 0.002, 0.006],
    floatSpeed: 1.5,
    floatIntensity: 0.6,
  },
  {
    geometry: "torusKnot",
    position: [1, 0.8, -1.5],
    size: 0.3,
    rotationSpeed: [0.002, 0.004, 0.003],
    floatSpeed: 1.0,
    floatIntensity: 1.0,
  },
  {
    geometry: "icosahedron",
    position: [3.5, -0.2, -2],
    size: 0.6,
    rotationSpeed: [0.005, 0.003, 0.004],
    floatSpeed: 0.8,
    floatIntensity: 0.7,
  },
  {
    geometry: "octahedron",
    position: [0, 0.2, -3],
    size: 0.8,
    rotationSpeed: [0.002, 0.006, 0.001],
    floatSpeed: 1.3,
    floatIntensity: 0.5,
  },
  {
    geometry: "torusKnot",
    position: [-3, -0.5, -1],
    size: 0.4,
    rotationSpeed: [0.006, 0.001, 0.005],
    floatSpeed: 1.1,
    floatIntensity: 0.9,
  },
];

function GeometryMesh({ config }: { config: ShapeConfig }) {
  const ref = useRef<THREE.Mesh>(null);
  const { rotationSpeed } = config;

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.x += rotationSpeed[0];
    ref.current.rotation.y += rotationSpeed[1];
    ref.current.rotation.z += rotationSpeed[2];
  });

  return (
    <Float
      speed={config.floatSpeed}
      floatIntensity={config.floatIntensity}
      rotationIntensity={0}
    >
      <mesh ref={ref} position={config.position}>
        {config.geometry === "icosahedron" && (
          <icosahedronGeometry args={[config.size, 0]} />
        )}
        {config.geometry === "octahedron" && (
          <octahedronGeometry args={[config.size, 0]} />
        )}
        {config.geometry === "torusKnot" && (
          <torusKnotGeometry args={[config.size, config.size * 0.3, 64, 8]} />
        )}
        <meshBasicMaterial
          color="#00DC82"
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>
    </Float>
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
      {shapes.map((config, i) => (
        <GeometryMesh key={i} config={config} />
      ))}
    </Canvas>
  );
}

export default FloatingShapes;
