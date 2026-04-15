"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Preload the model so it's ready before the hero mounts
useGLTF.preload('/models/mannequin.glb');

// ── Inner component (must live inside Canvas) ──────────────────────────────
function WireframeMannequin({ color }: { color: string }) {
    const { scene } = useGLTF('/models/mannequin.glb');
    const groupRef = useRef<THREE.Group>(null);

    // Replace every mesh material with a wireframe using the theme accent
    useEffect(() => {
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(color),
                wireframe: true,
                transparent: true,
                opacity: 0.88,
            });
            mesh.frustumCulled = false; // prevent pop-in during rotation
        });
    }, [scene, color]);

    // Gentle idle bob to signal interactivity before user touches
    useFrame((_, delta) => {
        if (!groupRef.current) return;
        groupRef.current.position.y = -1.1 + Math.sin(Date.now() * 0.0006) * 0.04;
    });

    return (
        <group ref={groupRef}>
            <primitive object={scene} scale={1.55} position={[0, 0, 0]} />
        </group>
    );
}

// ── Public component ───────────────────────────────────────────────────────
interface MannequinCanvasProps {
    accentColor: string;
}

export default function MannequinCanvas({ accentColor }: MannequinCanvasProps) {
    return (
        <Canvas
            camera={{ position: [0, 0.3, 4.2], fov: 46 }}
            dpr={[1, 1.5]}           // cap pixel ratio for mobile perf
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
        >
            {/*
              Lighting: two accent-coloured point lights give the wireframe
              a subtle halo on dark backgrounds without needing post-processing.
            */}
            <ambientLight intensity={0.08} />
            <pointLight position={[3, 4, 3]}   intensity={1.4} color={accentColor} />
            <pointLight position={[-3, -2, -2]} intensity={0.5} color={accentColor} />

            <Suspense fallback={null}>
                <WireframeMannequin color={accentColor} />
            </Suspense>

            {/*
              OrbitControls settings for "inspection" feel:
              • enableZoom / enablePan = false  → no accidental resize or drift
              • polar angle clamped to ~±25° from horizontal → horizontal-only spin
              • autoRotate + damping → alive when idle, smooth on release
              • rotateSpeed 0.45 → feels deliberate on mobile
            */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 2.6}
                maxPolarAngle={Math.PI / 1.8}
                autoRotate
                autoRotateSpeed={1.1}
                enableDamping
                dampingFactor={0.055}
                rotateSpeed={0.45}
            />
        </Canvas>
    );
}
