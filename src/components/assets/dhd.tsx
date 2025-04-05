import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DHDProps {
	position?: [number, number, number];
	isActive?: boolean;
	onActivate?: () => void;
}

const DHD: React.FC<DHDProps> = ({
	position = [0, 0, 0],
	isActive = false,
	onActivate = () => {}
}) => {
	const crystalRef = useRef<THREE.Mesh>(null);
	const [activationProgress, setActivationProgress] = useState(0);
	const lastActiveState = useRef(isActive);

	// Animation frame for gradual lighting
	useFrame((state, delta) => {
		if (!crystalRef.current) return;

		// Update activation progress
		if (isActive && activationProgress < 1) {
			setActivationProgress(prev => Math.min(prev + delta * 0.8, 1));
		} else if (!isActive && activationProgress > 0) {
			setActivationProgress(prev => Math.max(prev - delta * 1.5, 0));
		}

		// Apply the material changes
		const material = crystalRef.current.material as THREE.MeshStandardMaterial;

		// Base color transitions from red to orange
		const baseHue = isActive
			? 0.05 // Orange-red (active)
			: 0.0; // Red (inactive)

		// Interpolate hue based on activation progress
		const currentHue = THREE.MathUtils.lerp(0.0, baseHue, activationProgress);
		const color = new THREE.Color().setHSL(currentHue, 1, 0.5);

		// Set the material properties
		material.color.copy(color);
		material.emissive.copy(color);
		material.emissiveIntensity = THREE.MathUtils.lerp(0.5, 1.2, activationProgress);

		// Add a pulsing effect when active
		if (isActive && activationProgress > 0.8) {
			material.emissiveIntensity += Math.sin(state.clock.elapsedTime * 5) * 0.2;
		}
	});

	// Detect changes in isActive to play activation sound
	useEffect(() => {
		if (isActive && !lastActiveState.current) {
			// Play activation sound here if needed
			// (Audio code would go here)
		}
		lastActiveState.current = isActive;
	}, [isActive]);

	return (
		<group position={position} name="dhd">
			{/* Base */}
			<mesh position={[0, 0, 0]}>
				<cylinderGeometry args={[.5, 1, 1, 8]} />
				<meshStandardMaterial color="#555555" />
			</mesh>

			{/* Console top */}
			<mesh position={[0, 1, 0]} rotation={[0.5, 0, 0]}>
				<cylinderGeometry args={[1.2, 1.5, 0.3, 16]} />
				<meshStandardMaterial color="#333333" />
			</mesh>

			{/* Center control crystal */}
			<mesh
				ref={crystalRef}
				position={[0, 1.2, 0.2]}
				rotation={[0.5, 0, 0]}
				onClick={onActivate}
				onPointerOver={() => document.body.style.cursor = 'pointer'}
				onPointerOut={() => document.body.style.cursor = 'auto'}
			>
				<sphereGeometry args={[0.3, 16, 16]} />
				<meshStandardMaterial
					color="#ff3300"
					emissive="#ff3300"
					emissiveIntensity={0.5}
				/>
			</mesh>
		</group>
	);
};

export default DHD;
