"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

useGLTF.preload('/models/mannequin.glb');

// ── Pre-allocated vectors — reused every frame, zero GC pressure ──────────────
// These live at module scope so they are created once and never garbage-collected.
// Placing mutable objects inside useFrame would create one per call (60× / s).
const _chestLocal = new THREE.Vector3(0, 0.65, 0.32); // group-local chest estimate
const _chestWork  = new THREE.Vector3();               // scratch space for projection

// ─────────────────────────────────────────────────────────────────────────────
//  Scene — everything inside the Canvas context
// ─────────────────────────────────────────────────────────────────────────────
interface SceneProps {
    color:            string;
    chestButtonRef:   React.RefObject<HTMLDivElement | null>;
    rotationLocked:   React.RefObject<boolean>;
}

function Scene({ color, chestButtonRef, rotationLocked }: SceneProps) {
    const { scene } = useGLTF('/models/mannequin.glb');
    const { gl, size } = useThree();

    const groupRef     = useRef<THREE.Group>(null);
    const pulseLtRef   = useRef<THREE.PointLight>(null);
    const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

    // ── Rotation refs ─────────────────────────────────────────────────────────
    const showcaseRotRef  = useRef(0);
    const dragOffsetRef   = useRef(0);
    const isDraggingRef   = useRef(false);
    const lastPointerXRef = useRef(0);
    const lastInteractRef = useRef(Date.now());

    // ── Build wireframe materials ─────────────────────────────────────────────
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
            mesh.frustumCulled = false;
            mats.push(mat);
        });
        materialsRef.current = mats;
        return () => { mats.forEach(m => m.dispose()); };
    }, [scene, color]);

    // ── Pointer events ────────────────────────────────────────────────────────
    useEffect(() => {
        const el = gl.domElement;

        const onDown = (e: PointerEvent) => {
            if (rotationLocked.current) return; // chest button owns this touch
            isDraggingRef.current   = true;
            lastPointerXRef.current = e.clientX;
            lastInteractRef.current = Date.now();
        };
        const onMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return;
            dragOffsetRef.current  += (e.clientX - lastPointerXRef.current) * 0.007;
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
    }, [gl, rotationLocked]);

    // ── Main animation loop ───────────────────────────────────────────────────
    useFrame((state, delta) => {
        const group = groupRef.current;
        const light = pulseLtRef.current;
        if (!group) return;

        const t = state.clock.elapsedTime;

        // ── Breathing ─────────────────────────────────────────────────────────
        const BREATH_HZ = (2 * Math.PI) / 4.2;
        const phase = (Math.sin(t * BREATH_HZ) + 1) * 0.5; // 0..1

        group.scale.set(1 + phase * 0.007, 1 + phase * 0.015, 1 + phase * 0.007);
        group.position.y = phase * 0.032 - 0.016;

        const opacity = 0.50 + phase * 0.38;
        for (const mat of materialsRef.current) mat.opacity = opacity;
        if (light) light.intensity = 0.6 + phase * 1.8;

        // ── Rotation ──────────────────────────────────────────────────────────
        showcaseRotRef.current += delta * 0.18;
        const idleSec = (Date.now() - lastInteractRef.current) / 1000;
        if (idleSec > 10 && !isDraggingRef.current) {
            const lerpK = 1 - Math.pow(0.004, delta);
            dragOffsetRef.current *= (1 - lerpK);
        }
        group.rotation.y = showcaseRotRef.current + dragOffsetRef.current;

        // ── Chest button projection ───────────────────────────────────────────
        const btn = chestButtonRef.current;
        if (!btn) return;

        // Ensure matrix is current (useFrame runs before render, matrix may lag)
        group.updateMatrixWorld(true);

        // Transform chest-local → world
        _chestWork.copy(_chestLocal);
        group.localToWorld(_chestWork);

        const chestWorldZ = _chestWork.z; // save before project() mutates it

        // Hide when mannequin faces away (chest behind torso from camera view)
        if (chestWorldZ < 0.05) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            return;
        }

        // Project world → NDC → CSS pixels
        _chestWork.project(state.camera);
        const canvasW = gl.domElement.clientWidth;
        const canvasH = gl.domElement.clientHeight;
        const screenX = (_chestWork.x *  0.5 + 0.5) * canvasW;
        const screenY = (_chestWork.y * -0.5 + 0.5) * canvasH;

        // ── Drive button DOM directly (zero re-renders) ───────────────────────
        btn.style.display        = 'flex';
        btn.style.left           = `${screenX}px`;
        btn.style.top            = `${screenY}px`;
        btn.style.pointerEvents  = 'auto';

        // Opacity: fades in as chest comes more front-facing, also synced to breath
        const facingAlpha = Math.min(1, (chestWorldZ - 0.05) / 0.2); // 0..1 as z: 0.05→0.25
        btn.style.opacity = String((0.65 + phase * 0.35) * facingAlpha);

        // Box-shadow pulse: tight core glow + wide halo, both synced to breath
        const coreSize  = 8  + phase * 14;
        const haloSize  = 18 + phase * 28;
        const coreAlpha = Math.round((0.55 + phase * 0.45) * 255).toString(16).padStart(2, '0');
        const haloAlpha = Math.round((0.20 + phase * 0.25) * 255).toString(16).padStart(2, '0');
        btn.style.boxShadow = [
            `0 0 ${coreSize}px ${coreSize / 2}px ${color}${coreAlpha}`,
            `0 0 ${haloSize}px ${haloSize / 2}px ${color}${haloAlpha}`,
        ].join(', ');
    });

    return (
        <>
            <pointLight ref={pulseLtRef} position={[2, 2.5, 2.5]} intensity={1.2} color={color} />
            <pointLight position={[-2.5, -1, -2]} intensity={0.35} color={color} />
            <group ref={groupRef}>
                <primitive object={scene} scale={1.55} />
            </group>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public component
// ─────────────────────────────────────────────────────────────────────────────
export interface MannequinCanvasProps {
    accentColor:    string;
    chestButtonRef: React.RefObject<HTMLDivElement | null>;
    rotationLocked: React.RefObject<boolean>;
}

export default function MannequinCanvas({ accentColor, chestButtonRef, rotationLocked }: MannequinCanvasProps) {
    return (
        <Canvas
            camera={{ position: [0, 0.25, 4.2], fov: 46 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            style={{ background: 'transparent' }}
        >
            <ambientLight intensity={0.06} />
            <Suspense fallback={null}>
                <Scene color={accentColor} chestButtonRef={chestButtonRef} rotationLocked={rotationLocked} />
            </Suspense>
        </Canvas>
    );
}
