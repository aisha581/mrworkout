"use client";

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface Scene3DProps {
    accentColor: string;
    mode: 'mr' | 'mrs';
}

function RotatingModel({ accentColor, mode }: Scene3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Smooth rotation
            meshRef.current.rotation.y += 0.005;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
        }
    });

    return (
        <group>
            {/* Main glowing sphere */}
            <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={1}>
                <MeshDistortMaterial
                    color={accentColor}
                    attach="material"
                    distort={0.3}
                    speed={2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Sphere>

            {/* Inner glow */}
            <Sphere args={[1.3, 32, 32]} scale={1}>
                <meshBasicMaterial
                    color={accentColor}
                    transparent
                    opacity={0.3}
                />
            </Sphere>

            {/* Outer ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2, 0.05, 16, 100]} />
                <meshBasicMaterial
                    color={accentColor}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}

export default function Scene3D({ accentColor, mode }: Scene3DProps) {
    return (
        <>
            <ambientLight intensity={0.1} />
            <pointLight position={[10, 10, 10]} intensity={5} color={accentColor} />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#ffffff" />
            <spotLight position={[0, 5, 0]} intensity={10} color={accentColor} angle={0.15} />
            <RotatingModel accentColor={accentColor} mode={mode} />
        </>
    );
}
