import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface TravelSystemProps {
	isActive: boolean;
	isTraveling: boolean;
	destination: string;
	onTravel: () => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
}

const TravelSystem: React.FC<TravelSystemProps> = ({
	isActive,
	isTraveling,
	destination,
	onTravel,
	setIsInWormhole
}) => {
	const wormholeRef = useRef<THREE.Mesh>(null);
	const particlesRef = useRef<THREE.Points>(null);
	const travelStartTime = useRef<number | null>(null);
	const particlesGeometry = useRef<THREE.BufferGeometry | null>(null);
	const particlesPositions = useRef<Float32Array | null>(null);

	// Set up particle system for wormhole effect
	useEffect(() => {
		if (!particlesGeometry.current) {
			// Create particles for the wormhole effect
			particlesGeometry.current = new THREE.BufferGeometry();

			// Create 5000 particles
			const particleCount = 5000;
			particlesPositions.current = new Float32Array(particleCount * 3);

			// Distribute particles in a tunnel shape
			for (let i = 0; i < particleCount; i++) {
				const i3 = i * 3;
				const radius = Math.random() * 2;
				const theta = Math.random() * Math.PI * 2;
				const z = (Math.random() * 2 - 1) * 30;

				particlesPositions.current[i3] = Math.cos(theta) * radius;
				particlesPositions.current[i3 + 1] = Math.sin(theta) * radius;
				particlesPositions.current[i3 + 2] = z;
			}

			particlesGeometry.current.setAttribute(
				'position',
				new THREE.BufferAttribute(particlesPositions.current, 3)
			);
		}
	}, []);

	// Handle the wormhole effect animation
	useFrame((state, delta) => {
		// Only run if we're traveling
		if (isTraveling) {
			// Initialize the travel start time if not set
			if (travelStartTime.current === null) {
				travelStartTime.current = state.clock.elapsedTime;
				setIsInWormhole(true);
				console.log('Starting wormhole travel effect');
			}

			// Calculate how long we've been traveling
			const travelTime = state.clock.elapsedTime - travelStartTime.current;

			// Animate wormhole
			if (wormholeRef.current) {
				wormholeRef.current.rotation.z += delta * 2;

				// Wormhole tunnel distortion effect
				const material = wormholeRef.current.material as THREE.MeshStandardMaterial;
				material.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
			}

			// Animate particles
			if (particlesRef.current && particlesPositions.current && particlesGeometry.current) {
				// Make particles move toward the player
				for (let i = 0; i < particlesPositions.current.length / 3; i++) {
					const i3 = i * 3;

					// Move particles toward the camera (z axis)
					particlesPositions.current[i3 + 2] += delta * 20;

					// Reset particles that have passed the camera
					if (particlesPositions.current[i3 + 2] > 5) {
						particlesPositions.current[i3 + 2] = -30;
					}
				}

				// Update particles
				const positions = particlesGeometry.current.attributes.position;
				positions.needsUpdate = true;

				// Spin the particle system
				particlesRef.current.rotation.z += delta * 0.5;
			}

			// End travel after 3 seconds
			if (travelTime > 3) {
				console.log('Completing wormhole travel effect');
				travelStartTime.current = null;
				onTravel();
				setIsInWormhole(false);
			}
		} else {
			// Reset travel start time
			travelStartTime.current = null;
		}
	});

	// Only render when active and traveling
	if (!isActive || !isTraveling) return null;

	return (
		<group>
			{/* Wormhole tunnel effect */}
			<mesh ref={wormholeRef} position={[0, 0, -10]}>
				<torusGeometry args={[2, 0.5, 16, 32]} />
				<meshStandardMaterial
					color="#66ccff"
					emissive="#00aaff"
					emissiveIntensity={1.5}
					transparent={true}
					opacity={0.8}
				/>
			</mesh>

			{/* Particles for the wormhole */}
			{particlesGeometry.current && (
				<points ref={particlesRef}>
					<primitive object={particlesGeometry.current} attach="geometry" />
					<pointsMaterial
						size={0.1}
						color="#88ddff"
						transparent
						opacity={0.8}
						blending={THREE.AdditiveBlending}
					/>
				</points>
			)}
		</group>
	);
};

export default TravelSystem;
