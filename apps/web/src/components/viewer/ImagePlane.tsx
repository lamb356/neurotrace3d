"use client";

import { useRef, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useImageStore } from "@/store/useImageStore";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uContrast;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    vec3 color = tex.rgb;
    color = (color - 0.5) * uContrast + 0.5;
    color = color + uBrightness;
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export default function ImagePlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const width = useImageStore((s) => s.width);
  const height = useImageStore((s) => s.height);
  const scale = useImageStore((s) => s.scale);
  const currentZ = useImageStore((s) => s.currentZ);
  const sliceTextures = useImageStore((s) => s.sliceTextures);
  const opacity = useImageStore((s) => s.opacity);
  const brightness = useImageStore((s) => s.brightness);
  const contrast = useImageStore((s) => s.contrast);
  const offsetX = useImageStore((s) => s.offsetX);
  const offsetY = useImageStore((s) => s.offsetY);
  const offsetZ = useImageStore((s) => s.offsetZ);
  const plane = useImageStore((s) => s.plane);
  const physicalPixelSize = useImageStore((s) => s.physicalPixelSize);

  // Create a persistent DataTexture
  const texture = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array(4), // 1x1 placeholder
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.flipY = true;
    return tex;
  }, []);

  // Update texture when current slice data changes
  const currentRGBA = sliceTextures.get(currentZ);
  useEffect(() => {
    if (!currentRGBA || width === 0 || height === 0) return;

    texture.image = { data: currentRGBA, width, height };
    texture.needsUpdate = true;
    invalidate();
  }, [currentRGBA, width, height, texture, invalidate]);

  // Create shader material
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uOpacity: { value: opacity },
      uBrightness: { value: brightness },
      uContrast: { value: contrast },
    }),
    // Only create once — update via refs below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture],
  );

  // Update uniforms reactively
  const matRef = useRef<THREE.ShaderMaterial>(null);
  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uOpacity.value = opacity;
    matRef.current.uniforms.uBrightness.value = brightness;
    matRef.current.uniforms.uContrast.value = contrast;
    matRef.current.needsUpdate = true;
    invalidate();
  }, [opacity, brightness, contrast, invalidate]);

  // Compute geometry size in neuron coordinate space
  const planeWidth = width * scale;
  const planeHeight = height * scale;

  // Compute position and rotation based on orientation plane
  const zSpacing = physicalPixelSize?.z ?? scale;
  const position = useMemo((): [number, number, number] => {
    const zOffset = currentZ * zSpacing;
    if (plane === "xy") return [offsetX + planeWidth / 2, offsetY + planeHeight / 2, offsetZ + zOffset];
    if (plane === "xz") return [offsetX + planeWidth / 2, offsetY + zOffset, offsetZ + planeHeight / 2];
    // yz
    return [offsetX + zOffset, offsetY + planeWidth / 2, offsetZ + planeHeight / 2];
  }, [plane, offsetX, offsetY, offsetZ, currentZ, zSpacing, planeWidth, planeHeight]);

  const rotation = useMemo((): [number, number, number] => {
    if (plane === "xy") return [0, 0, 0];
    if (plane === "xz") return [-Math.PI / 2, 0, 0];
    // yz
    return [0, Math.PI / 2, 0];
  }, [plane]);

  // Trigger re-render on position/rotation changes
  useEffect(() => {
    invalidate();
  }, [position, rotation, invalidate]);

  if (width === 0 || height === 0) return null;

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      renderOrder={-1}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
