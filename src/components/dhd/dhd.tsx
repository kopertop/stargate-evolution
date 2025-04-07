import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Define colors
const DHD_BASE_COLOR = '#333333';
const DHD_PANEL_COLOR = '#444444';
const DHD_ACTIVE_COLOR = '#00aaff';
const DHD_INACTIVE_COLOR = '#aa0000';
const DHD_SYMBOL_COLOR = '#777777';

interface DHDProps {
	position: [number, number, number];
	isActive: boolean;
}

export const DHD: React.FC<DHDProps> = ({ position, isActive }) => {
	const centerButtonRef = useRef<THREE.Mesh>(null);

	// Pulse animation for the center button when active
	useFrame((state) => {
		if (!centerButtonRef.current) return;

		if (isActive) {
			// Pulsing glow when active
			if (centerButtonRef.current.material instanceof THREE.MeshStandardMaterial) {
				const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
				centerButtonRef.current.material.emissiveIntensity = intensity;
			}
		}
	});

	return (
		<group position={position}>
			{/* Base stand */}
			<mesh castShadow receiveShadow position={[0, 0.4, 0]}>
				<cylinderGeometry args={[0.6, 0.8, 0.8, 16]} />
				<meshStandardMaterial color={DHD_BASE_COLOR} metalness={0.6} roughness={0.4} />
			</mesh>

			{/* Middle section */}
			<mesh castShadow receiveShadow position={[0, 0.8, 0]}>
				<cylinderGeometry args={[0.5, 0.6, 0.2, 16]} />
				<meshStandardMaterial color={DHD_BASE_COLOR} metalness={0.6} roughness={0.4} />
			</mesh>

			{/* Main console */}
			<mesh castShadow receiveShadow position={[0, 1.0, 0]} rotation={[Math.PI * 0.25, 0, 0]}>
				<sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
				<meshStandardMaterial color={DHD_PANEL_COLOR} metalness={0.5} roughness={0.6} />
			</mesh>

			{/* Center activation button */}
			<mesh
				ref={centerButtonRef}
				castShadow
				position={[0, 1.25, 0.3]}
				rotation={[Math.PI * 0.25, 0, 0]}
			>
				<sphereGeometry args={[0.2, 16, 16]} />
				<meshStandardMaterial
					color={isActive ? DHD_ACTIVE_COLOR : DHD_INACTIVE_COLOR}
					emissive={isActive ? DHD_ACTIVE_COLOR : '#000000'}
					emissiveIntensity={isActive ? 0.5 : 0}
					roughness={0.3}
					metalness={0.7}
				/>
			</mesh>

			{/* Symbol buttons */}
			{Array.from({ length: 20 }).map((_, index) => {
				// Arrange in a semi-circle pattern
				const angle = (Math.PI - (index / 19) * Math.PI) * 0.8 + Math.PI * 0.1;
				const radius = 0.8;
				const row = Math.floor(index / 10);
				const rowOffset = row * 0.15;
				const x = Math.cos(angle) * (radius - rowOffset);
				const z = Math.sin(angle) * (radius - rowOffset);

				return (
					<group
						key={index}
						position={[x, 1.1 + rowOffset, z]}
						rotation={[Math.PI * 0.25, 0, 0]}
					>
						{/* Button base */}
						<mesh castShadow>
							<cylinderGeometry args={[0.06, 0.08, 0.05, 8]} />
							<meshStandardMaterial color={DHD_PANEL_COLOR} metalness={0.6} roughness={0.4} />
						</mesh>

						{/* Button top */}
						<mesh castShadow position={[0, 0.03, 0]}>
							<cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
							<meshStandardMaterial color={DHD_SYMBOL_COLOR} metalness={0.3} roughness={0.3} />
						</mesh>

						{/* Symbol */}
						<mesh castShadow position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
							<planeGeometry args={[0.05, 0.05]} />
							<meshStandardMaterial color="#000000" transparent opacity={0.7} />
						</mesh>
					</group>
				);
			})}

			{/* Decorative rim around console */}
			<mesh castShadow receiveShadow position={[0, 1.0, 0]} rotation={[Math.PI * 0.25, 0, 0]}>
				<torusGeometry args={[0.95, 0.05, 8, 32, Math.PI * 0.5]} />
				<meshStandardMaterial color={DHD_BASE_COLOR} metalness={0.7} roughness={0.3} />
			</mesh>
		</group>
	);
};
