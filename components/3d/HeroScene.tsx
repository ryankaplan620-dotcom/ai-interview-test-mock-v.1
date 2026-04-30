"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 2000;
const REPULSION_RADIUS = 2;
const RETURN_SPEED = 0.5; // spring-like return over ~2s

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mouse = useRef(new THREE.Vector3(0, 0, 0));
  const mouseActive = useRef(false);

  // Generate rest positions in a spherical volume
  const restPositions = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * 3.5; // sphere radius 3.5
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  // Current positions (start at rest)
  const currentPositions = useMemo(
    () => new Float32Array(restPositions),
    [restPositions]
  );

  // Per-particle phase offsets for drift
  const phases = useMemo(() => {
    const p = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      p[i] = Math.random() * Math.PI * 2;
    }
    return p;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = clock.getElapsedTime();
    const mx = mouse.current.x;
    const my = mouse.current.y;
    const mz = mouse.current.z;
    const isActive = mouseActive.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Target = rest position + gentle drift
      const driftX =
        Math.sin(t * 0.3 + phases[i3]) * 0.08 +
        Math.cos(t * 0.2 + phases[i3 + 1]) * 0.05;
      const driftY =
        Math.sin(t * 0.25 + phases[i3 + 1]) * 0.08 +
        Math.cos(t * 0.15 + phases[i3 + 2]) * 0.05;
      const driftZ =
        Math.sin(t * 0.2 + phases[i3 + 2]) * 0.06 +
        Math.cos(t * 0.3 + phases[i3]) * 0.04;

      let targetX = restPositions[i3] + driftX;
      let targetY = restPositions[i3 + 1] + driftY;
      let targetZ = restPositions[i3 + 2] + driftZ;

      // Mouse repulsion
      if (isActive) {
        const dx = currentPositions[i3] - mx;
        const dy = currentPositions[i3 + 1] - my;
        const dz = currentPositions[i3 + 2] - mz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < REPULSION_RADIUS && dist > 0.01) {
          const force = (1 - dist / REPULSION_RADIUS) * 1.5;
          targetX += (dx / dist) * force;
          targetY += (dy / dist) * force;
          targetZ += (dz / dist) * force;
        }
      }

      // Spring-like return
      currentPositions[i3] += (targetX - currentPositions[i3]) * RETURN_SPEED * 0.016;
      currentPositions[i3 + 1] +=
        (targetY - currentPositions[i3 + 1]) * RETURN_SPEED * 0.016;
      currentPositions[i3 + 2] +=
        (targetZ - currentPositions[i3 + 2]) * RETURN_SPEED * 0.016;

      dummy.position.set(
        currentPositions[i3],
        currentPositions[i3 + 1],
        currentPositions[i3 + 2]
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.point) {
      mouse.current.copy(e.point);
      mouseActive.current = true;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouseActive.current = false;
  }, []);

  return (
    <>
      {/* Invisible plane for raycasting mouse position */}
      <mesh
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#00DC82" transparent opacity={0.6} />
      </instancedMesh>
    </>
  );
}

function CameraOrbit() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * 0.05;
    const radius = 8;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function HeroScene() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Check for mobile
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
      camera={{ position: [0, 0, 8], fov: 50 }}
      gl={{ antialias: false, alpha: true }}
      style={{ pointerEvents: "auto" }}
    >
      <Particles />
      <CameraOrbit />
    </Canvas>
  );
}

export default HeroScene;
