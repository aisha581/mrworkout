"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Warm the loader cache before the component mounts
useGLTF.preload('/models/mannequin.glb');

// ─────────────────────────────────────────────────────────────────────────────
//  Scene — everything that must live *inside* the Canvas
// ─────────────────────────────────────────────────────────────────────────────
function Scene({ color }: { color: string }) {
    const { scene } = useGLTF('/models/mannequin.glb');
    const { gl }    = useThree();

    // ── Object refs (mutated imperatively — zero React re-renders) ────────────
    const groupRef     = useRef<THREE.Group>(null);
    const pulseLtRef   = useRef<THREE.PointLight>(null);
    const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

    // ── Rotation state ────────────────────────────────────────────────────────
    //   showcaseRot: continuous slow spin, always ticking
    //   dragOffset:  accumulated user drag; lerps → 0 after 10 s idle
    const showcaseRotRef  = useRef(0);
    const dragOffsetRef   = useRef(0);
    const isDraggingRef   = useRef(false);
    const lastPointerXRef = useRef(0);
    const lastInteractRef = useRef(Date.now());

    // ── Build wireframe materials once (or on color change) ───────────────────
    useEffect(() => {
        const mats: THREE.MeshBasicMaterial[] = [];
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = new THREE.MeshBasicMaterial({
                color:       new THREE.Color(color),
                wireframe:   true,
                transparent: true,
                opacity:     0.72,
            });
            mesh.material      = mat;
            mesh.frustumCulled = false; // prevent pop-in while rotating
            mats.push(mat);
        });
        materialsRef.current = mats;

        // Cleanup — dispose on unmount or color change to avoid VRAM leaks
        return () => { mats.forEach(m => m.dispose()); };
    }, [scene, color]);

    // ── Pointer events — wired to gl.domElement, not React synthetic system ───
    //   { passive: true } tells the browser these handlers never call
    //   preventDefault(), enabling optimised event batching on mobile.
    useEffect(() => {
        const el = gl.domElement;

        const onDown = (e: PointerEvent) => {
            isDraggingRef.current   = true;
            lastPointerXRef.current = e.clientX;
            lastInteractRef.current = Date.now();
        };

        const onMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return;
            const dx = e.clientX - lastPointerXRef.current;
            dragOffsetRef.current  += dx * 0.007;
            lastPointerXRef.current = e.clientX;
            lastInteractRef.current = Date.now();
        };

        const onUp = () => {
            isDraggingRef.current   = false;
            lastInteractRef.current = Date.now();
        };

        el.addEventListener('pointerdown',   onDown, { passive: true });
        el.addEventListener('pointermove',   onMove, { passive: true });
        el.addEventListener('pointerup',     onUp,   { passive: true });
        el.addEventListener('pointercancel', onUp,   { passive: true });

        return () => {
            el.removeEventListener('pointerdown',   onDown);
            el.removeEventListener('pointermove',   onMove);
            el.removeEventListener('pointerup',     onUp);
            el.removeEventListener('pointercancel', onUp);
        };
    }, [gl]);

    // ── Main animation loop — runs inside rAF, zero React state touched ───────
    useFrame((state, delta) => {
        const group  = groupRef.current;
        const light  = pulseLtRef.current;
        if (!group) return;

        const t = state.clock.elapsedTime;

        // ── Breathing ──────────────────────────────────────────────────────────
        //   Period: 4.2 s — comfortable, meditative breathing rate.
        //   phase: 0 (exhale) → 1 (inhale), smooth sinusoid.
        const BREATH_HZ = (2 * Math.PI) / 4.2;
        const phase = (Math.sin(t * BREATH_HZ) + 1) * 0.5; // 0..1

        //   Scale: extremely subtle chest swell (barely perceptible, just alive)
        group.scale.set(
            1.0 + phase * 0.007,   // lateral expansion
            1.0 + phase * 0.015,   // vertical chest rise
            1.0 + phase * 0.007,
        );

        //   Vertical drift: synced to breath so the model gently "lifts" on inhale
        group.position.y = phase * 0.032 - 0.016;

        //   Material opacity pulse: exhale → dim, inhale → bright
        //   Range: 0.50 (exhale) → 0.88 (inhale)
        const opacity = 0.50 + phase * 0.38;
        for (const mat of materialsRef.current) mat.opacity = opacity;

        //   Point light intensity synced to breath:
        //   exhale → 0.6, inhale → 2.4
        if (light) light.intensity = 0.6 + phase * 1.8;

        // ── Rotation ───────────────────────────────────────────────────────────
        //   Showcase rotation: always-on slow spin (~35 s per revolution)
        showcaseRotRef.current += delta * 0.18;

        //   Auto-center: if idle for 10 s, lerp drag offset → 0
        const idleSec = (Date.now() - lastInteractRef.current) / 1000;
        if (idleSec > 10 && !isDraggingRef.current) {
            // delta-scaled lerp so the rate stays consistent regardless of fps
            const lerpK = 1 - Math.pow(0.004, delta); // ≈ 0.02 at 60 fps, 0.04 at 30 fps
            dragOffsetRef.current *= (1 - lerpK);
        }

        group.rotation.y = showcaseRotRef.current + dragOffsetRef.current;
    });

    return (
        <>
            {/* Pulse light — synced to breathing in useFrame above */}
            <pointLight
                ref={pulseLtRef}
                position={[2, 2.5, 2.5]}
                intensity={1.2}
                color={color}
            />
            {/* Fill light — static, keeps the back of the model from going black */}
            <pointLight
                position={[-2.5, -1, -2]}
                intensity={0.35}
                color={color}
            />

            <group ref={groupRef}>
                <primitive object={scene} scale={1.55} />
            </group>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public component — just the Canvas shell
// ─────────────────────────────────────────────────────────────────────────────
interface MannequinCanvasProps {
    accentColor: string;
}

export default function MannequinCanvas({ accentColor }: MannequinCanvasProps) {
    return (
        <Canvas
            camera={{ position: [0, 0.25, 4.2], fov: 46 }}
            // Cap DPR at 1.5 — 2× screens get half-res (imperceptible on small
            // screen, saves ~30 % fill-rate on Retina/AMOLED panels).
            dpr={[1, 1.5]}
            // low-power hint tells the driver to prefer the integrated GPU
            // on M-chip Macs and Android devices with hybrid GPU setups.
            gl={{
                antialias:        true,
                alpha:            true,
                powerPreference:  'low-power',
            }}
            style={{ background: 'transparent' }}
        >
            {/* Minimal ambient — just enough to prevent total darkness on back faces */}
            <ambientLight intensity={0.06} />

            <Suspense fallback={null}>
                <Scene color={accentColor} />
            </Suspense>
        </Canvas>
    );
}
