"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

function GradientSphere() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color("#00DC82") },
        uColor2: { value: new THREE.Color("#00A862") },
        uColor3: { value: new THREE.Color("#004D35") },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        uniform float uTime;

        void main() {
          vPosition = position;
          vNormal = normal;
          // Layered displacement with a slow "speech-like" pulse so the form
          // reads as voice-reactive rather than a uniform wobble.
          float pulse = 0.6 + 0.4 * sin(uTime * 1.4);
          float displacement = sin(position.x * 3.0 + uTime * 0.5) * 0.03
            + sin(position.y * 4.0 + uTime * 0.3) * 0.02
            + sin(position.z * 2.0 + uTime * 0.7) * 0.025 * pulse;
          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        void main() {
          float t = (vPosition.y + 1.5) / 3.0;
          t += sin(vPosition.x * 2.0 + uTime * 0.3) * 0.1;
          vec3 color;
          if (t < 0.5) {
            color = mix(uColor3, uColor2, t * 2.0);
          } else {
            color = mix(uColor2, uColor1, (t - 0.5) * 2.0);
          }
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
          color += vec3(0.0, 0.86, 0.51) * fresnel * 0.4;
          gl_FragColor = vec4(color, 0.85);
        }
      `,
      transparent: true,
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    gradientMaterial.uniforms.uTime.value = t;
    gradientMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
    targetRotation.current.x = mouseRef.current.y * 0.3;
    targetRotation.current.y = mouseRef.current.x * 0.3 + t * 0.1;
    meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * 0.02;
    meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * 0.02;
    wireRef.current.rotation.x += (targetRotation.current.x - wireRef.current.rotation.x) * 0.015;
    wireRef.current.rotation.y += (targetRotation.current.y - wireRef.current.rotation.y) * 0.015;
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.02 + Math.sin(t * 0.8) * 0.02;
    }
  });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <group position={[viewport.width * 0.25, -0.3, 0]}>
      <mesh ref={meshRef} material={gradientMaterial}>
        <icosahedronGeometry args={[2.2, 64]} />
      </mesh>
      {/* Refined wireframe overlay */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[2.4, 20]} />
        <meshBasicMaterial color="#00DC82" wireframe transparent opacity={0.05} />
      </mesh>
      {/* Soft glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial color="#00DC82" transparent opacity={0.03} />
      </mesh>
      <OrbitRing />
      <VoiceWaveRing />
    </group>
  );
}

function OrbitRing() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = Math.PI * 0.4 + Math.sin(t * 0.2) * 0.1;
    ref.current.rotation.z = t * 0.15;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[3, 0.008, 16, 100]} />
      <meshBasicMaterial color="#00DC82" transparent opacity={0.22} />
    </mesh>
  );
}

// Radial "equalizer" — bars around the sphere that pulse like a voice waveform.
function VoiceWaveRing() {
  const COUNT = 56;
  const RADIUS = 2.7;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      // Layered sine waves read as speech-like amplitude rather than a uniform hum.
      const amp =
        0.12 +
        Math.abs(Math.sin(a * 3 + t * 1.7)) * 0.2 +
        Math.abs(Math.sin(a * 7 - t * 1.1)) * 0.1;
      dummy.position.set(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS, 0);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.scale.set(1, amp, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group rotation={[Math.PI * 0.42, 0, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[0.03, 1, 0.03]} />
        <meshBasicMaterial color="#00DC82" transparent opacity={0.5} />
      </instancedMesh>
    </group>
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
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00DC82" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#ffffff" />
      <GradientSphere />
    </Canvas>
  );
}
