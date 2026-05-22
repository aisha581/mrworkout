"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html }               from '@react-three/drei';
import { Suspense, useEffect, useRef }  from 'react';
import * as THREE                       from 'three';
import { Zap }                          from 'lucide-react';

if (typeof window !== 'undefined') useGLTF.preload('/models/mannequin.glb');

// ── Module-level scratch vectors — allocated once, reused every frame ─────────
const _chestLocal = new THREE.Vector3(0, 0.65, 0.32);
const _chestWork  = new THREE.Vector3();

// ─────────────────────────────────────────────────────────────────────────────
//  Scene — lives inside the Canvas
// ─────────────────────────────────────────────────────────────────────────────
interface SceneProps {
    color:      string;
    onChestTap: () => void;
}

function Scene({ color, onChestTap }: SceneProps) {
    const { scene } = useGLTF('/models/mannequin.glb');
    const { gl }    = useThree();

    // ── Object refs ───────────────────────────────────────────────────────────
    const groupRef     = useRef<THREE.Group>(null);
    const pulseLtRef   = useRef<THREE.PointLight>(null);
    const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

    // ── Chest-button DOM ref (inner div inside Html portal) ───────────────────
    // We mutate style directly in useFrame — zero React re-renders.
    const chestDivRef = useRef<HTMLDivElement>(null);

    // ── Rotation refs ─────────────────────────────────────────────────────────
    const showcaseRotRef  = useRef(0);
    const dragOffsetRef   = useRef(0);
    const isDraggingRef   = useRef(false);
    const lastPointerXRef = useRef(0);
    const lastInteractRef = useRef(Date.now());
    // Set true while the chest button is held — prevents canvas from starting a drag
    const rotationLocked  = useRef(false);

    // ── Build wireframe materials ─────────────────────────────────────────────
    useEffect(() => {
        const mats: THREE.MeshBasicMaterial[] = [];
        scene.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(color), wireframe: true,
                transparent: true, opacity: 0.72,
            });
            mesh.material      = mat;
            mesh.frustumCulled = false;
            mats.push(mat);
        });
        materialsRef.current = mats;
        return () => { mats.forEach(m => m.dispose()); };
    }, [scene, color]);

    // ── Canvas pointer events for rotation ───────────────────────────────────
    useEffect(() => {
        const el = gl.domElement;
        const onDown = (e: PointerEvent) => {
            if (rotationLocked.current) return;
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
        const onUp = () => { isDraggingRef.current = false; lastInteractRef.current = Date.now(); };

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

    // ── Animation loop ────────────────────────────────────────────────────────
    useFrame((state, delta) => {
        const group = groupRef.current;
        const light = pulseLtRef.current;
        if (!group) return;

        const t = state.clock.elapsedTime;

        // ── Breathing (4.2 s cycle) ────────────────────────────────────────────
        const BREATH_HZ = (2 * Math.PI) / 4.2;
        const phase = (Math.sin(t * BREATH_HZ) + 1) * 0.5; // 0..1

        group.scale.set(1 + phase * 0.007, 1 + phase * 0.015, 1 + phase * 0.007);
        group.position.y = phase * 0.032 - 0.016;
        for (const mat of materialsRef.current) mat.opacity = 0.50 + phase * 0.38;
        if (light) light.intensity = 0.6 + phase * 1.8;

        // ── Rotation ──────────────────────────────────────────────────────────
        showcaseRotRef.current += delta * 0.18;
        const idleSec = (Date.now() - lastInteractRef.current) / 1000;
        if (idleSec > 10 && !isDraggingRef.current) {
            dragOffsetRef.current *= (1 - (1 - Math.pow(0.004, delta)));
        }
        group.rotation.y = showcaseRotRef.current + dragOffsetRef.current;

        // ── Chest button glow sync ─────────────────────────────────────────────
        //   Html handles 3D→CSS positioning automatically every frame.
        //   We only need to drive the glow and visibility.
        const btn = chestDivRef.current;
        if (!btn) return;

        group.updateMatrixWorld(true);
        _chestWork.copy(_chestLocal);
        group.localToWorld(_chestWork);
        const chestWorldZ = _chestWork.z;

        if (chestWorldZ < 0.05) {
            // Facing away — hide completely
            btn.style.opacity       = '0';
            btn.style.pointerEvents = 'none';
        } else {
            const facingAlpha = Math.min(1, (chestWorldZ - 0.05) / 0.2);
            btn.style.opacity       = String((0.65 + phase * 0.35) * facingAlpha);
            btn.style.pointerEvents = 'auto';

            // Dual-layer glow: tight core + wide halo, both synced to breath
            const core  = 8  + phase * 14;
            const halo  = 18 + phase * 28;
            const cHex  = Math.round((0.55 + phase * 0.45) * 255).toString(16).padStart(2, '0');
            const hHex  = Math.round((0.18 + phase * 0.22) * 255).toString(16).padStart(2, '0');
            btn.style.boxShadow = `0 0 ${core}px ${core/2}px ${color}${cHex}, 0 0 ${halo}px ${halo/2}px ${color}${hHex}`;
        }
    });

    return (
        <>
            <pointLight ref={pulseLtRef} position={[2, 2.5, 2.5]} intensity={1.2} color={color} />
            <pointLight position={[-2.5, -1, -2]} intensity={0.35} color={color} />

            <group ref={groupRef}>
                <primitive object={scene} scale={1.4} />

                {/*
                  Html anchors the button in 3D group-local space.
                  Because it's a child of the group, it rotates with the mannequin.
                  drei re-projects the position to CSS coordinates every frame.
                  zIndexRange keeps it above the canvas overlay (z-2) but below
                  our modal stack (z-550+).
                */}
                <Html
                    position={[0, 0.65, 0.32]}
                    center
                    zIndexRange={[30, 0]}
                    // Prevent the Html wrapper from capturing pointer events
                    // so canvas drag still works around the button
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        ref={chestDivRef}
                        onClick={() => {
                            navigator.vibrate?.([15, 10, 25]);
                            onChestTap();
                        }}
                        onPointerDown={() => { rotationLocked.current = true; }}
                        onPointerUp={()   => { rotationLocked.current = false; }}
                        onPointerCancel={() => { rotationLocked.current = false; }}
                        onTouchStart={() => {
                            if (chestDivRef.current)
                                chestDivRef.current.style.transform = 'scale(0.85)';
                        }}
                        onTouchEnd={() => {
                            if (chestDivRef.current)
                                chestDivRef.current.style.transform = 'scale(1)';
                        }}
                        style={{
                            pointerEvents:       'auto',  // override Html wrapper's none
                            width:               52,
                            height:              52,
                            borderRadius:        '50%',
                            display:             'flex',
                            flexDirection:       'column',
                            alignItems:          'center',
                            justifyContent:      'center',
                            cursor:              'pointer',
                            background:          'rgba(0,0,0,0.55)',
                            border:              `1px solid ${color}55`,
                            backdropFilter:      'blur(12px)',
                            WebkitBackdropFilter:'blur(12px)',
                            touchAction:         'manipulation',
                            transition:          'transform 0.08s ease',
                            // opacity & boxShadow driven by useFrame above
                        }}
                    >
                        <Zap size={18} fill={color} style={{ color, display: 'block' }} />
                        <span style={{
                            position:      'absolute',
                            bottom:        -20,
                            fontSize:      7,
                            fontWeight:    900,
                            letterSpacing: '0.2em',
                            color,
                            opacity:       0.6,
                            whiteSpace:    'nowrap',
                            textTransform: 'uppercase',
                            pointerEvents: 'none',
                        }}>
                            Mission
                        </span>
                    </div>
                </Html>
            </group>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public component
// ─────────────────────────────────────────────────────────────────────────────
export interface MannequinCanvasProps {
    accentColor: string;
    onChestTap:  () => void;
}

export default function MannequinCanvas({ accentColor, onChestTap }: MannequinCanvasProps) {
    return (
        <Canvas
            // Camera pulled back + FOV widened so the full body shows on
            // narrow mobile viewports (portrait 9:19 aspect ratio).
            camera={{ position: [0, 0.1, 5.0], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            style={{ background: 'transparent' }}
        >
            <ambientLight intensity={0.06} />
            <Suspense fallback={null}>
                <Scene color={accentColor} onChestTap={onChestTap} />
            </Suspense>
        </Canvas>
    );
}
