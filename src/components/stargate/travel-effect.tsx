import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StargateWormholeProps {
	active: boolean;
	onComplete: () => void;
	duration?: number;
}

const StargateWormholeEffect: React.FC<StargateWormholeProps> = ({
	active,
	onComplete,
	duration = 5
}) => {
	const groupRef = useRef<THREE.Group>(null);
	const particlesRef = useRef<THREE.Points>(null);
	const timeRef = useRef(0);
	const completedRef = useRef(false);

	// Create stargate wormhole tunnel particles
	useEffect(() => {
		if (!particlesRef.current || !active) return;

		// Reset state
		timeRef.current = 0;
		completedRef.current = false;

		// Generate particles
		const particleCount = 5000;
		const positions = new Float32Array(particleCount * 3);
		const colors = new Float32Array(particleCount * 3);
		const sizes = new Float32Array(particleCount);

		// Generate initial particles in a tunnel-like formation
		for (let i = 0; i < particleCount; i++) {
			// Place particles in a tunnel shape
			const angle = Math.random() * Math.PI * 2;
			const radius = 2 + Math.random() * 1;
			const depth = -50 + Math.random() * 100;

			// Position
			positions[i * 3] = Math.cos(angle) * radius;
			positions[i * 3 + 1] = Math.sin(angle) * radius;
			positions[i * 3 + 2] = depth;

			// Color - blue/cyan streaks
			colors[i * 3] = 0.2 + Math.random() * 0.2; // r
			colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // g
			colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // b

			// Size
			sizes[i] = 0.1 + Math.random() * 0.3;
		}

		// Update geometry
		const geometry = (particlesRef.current.geometry as THREE.BufferGeometry);
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
	}, [active]);

	// Animate the wormhole when active
	useFrame((state, delta) => {
		if (!active || !groupRef.current || !particlesRef.current || completedRef.current) return;

		// Update time
		timeRef.current += delta;

		// Get normalized time (0 to 1)
		const normalizedTime = Math.min(timeRef.current / duration, 1);

		// Animate particles
		const positions = (particlesRef.current.geometry as THREE.BufferGeometry).attributes.position;
		const sizes = (particlesRef.current.geometry as THREE.BufferGeometry).attributes.size;

		for (let i = 0; i < positions.count; i++) {
			// Move particles forward to create rushing effect
			const z = positions.getZ(i);
			const newZ = z + delta * (50 + 20 * Math.random()); // Forward movement speed

			// Reset particles that go too far ahead
			if (newZ > 50) {
				positions.setZ(i, -50);

				// Randomize x,y position slightly for varied effect
				const angle = Math.random() * Math.PI * 2;
				const radius = 1.5 + Math.random() * 1.5;
				positions.setX(i, Math.cos(angle) * radius);
				positions.setY(i, Math.sin(angle) * radius);

				// Pulsate size
				sizes.setX(i, 0.1 + Math.random() * 0.4);
			} else {
				positions.setZ(i, newZ);
			}
		}

		positions.needsUpdate = true;
		sizes.needsUpdate = true;

		// Create a camera-shake-like effect as we travel
		if (groupRef.current) {
			const shake = Math.sin(timeRef.current * 10) * 0.05 * (1 - normalizedTime);
			groupRef.current.position.x = shake;
			groupRef.current.position.y = shake * 0.7;
		}

		// Apply overall effects based on journey progress
		const material = particlesRef.current.material as THREE.PointsMaterial;

		// Start of journey - ramp up speed and brightness
		if (normalizedTime < 0.2) {
			material.opacity = normalizedTime / 0.2;
		}
		// End of journey - fade out
		else if (normalizedTime > 0.8) {
			material.opacity = 1 - ((normalizedTime - 0.8) / 0.2);
		}

		// Signal completion when done
		if (normalizedTime === 1 && !completedRef.current) {
			completedRef.current = true;
			onComplete();
		}
	});

	if (!active) return null;

	return (
		<group ref={groupRef}>
			{/* Add a camera near effect to simulate first-person */}
			<mesh position={[0, 0, -1]}>
				<planeGeometry args={[5, 5]} />
				<meshBasicMaterial color="#0066ff" transparent opacity={0.1} />
			</mesh>

			{/* Wormhole particles */}
			<points ref={particlesRef}>
				<bufferGeometry />
				<pointsMaterial
					size={0.2}
					vertexColors
					transparent
					opacity={1}
					blending={THREE.AdditiveBlending}
					depthWrite={false}
				/>
			</points>

			{/* Tunnel ambient light */}
			<ambientLight intensity={1} color="#00aaff" />

			{/* Moving light to create dynamic shadows */}
			<pointLight
				position={[0, 0, -10]}
				intensity={2}
				color="#ffffff"
				distance={20}
			/>
		</group>
	);
};

export default StargateWormholeEffect;
