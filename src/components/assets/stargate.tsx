import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateProps {
	position?: [number, number, number];
	isActive?: boolean;
	onActivate?: () => void;
}

const Stargate: React.FC<StargateProps> = ({
	position = [0, 0, 0],
	isActive = false,
	onActivate = () => {}
}) => {
	const eventHorizonRef = useRef<THREE.Mesh>(null);

	// Animation for the event horizon
	useFrame((state, delta) => {
		if (eventHorizonRef.current && isActive) {
			// Rotate the event horizon when active
			eventHorizonRef.current.rotation.z += delta * 0.5;

			// Pulse the emissive intensity
			const material = eventHorizonRef.current.material as THREE.MeshStandardMaterial;
			material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
		}
	});

	return (
		<group position={position}>
			{/* Outer ring */}
			<mesh>
				<torusGeometry args={[3, 0.5, 16, 32]} />
				<meshStandardMaterial color="#444444" />
			</mesh>

			{/* Inner part (event horizon placeholder) - Now interactive */}
			<mesh
				ref={eventHorizonRef}
				onClick={onActivate}
				onPointerOver={() => document.body.style.cursor = 'pointer'}
				onPointerOut={() => document.body.style.cursor = 'auto'}
			>
				<circleGeometry args={[2.5, 32]} />
				<meshStandardMaterial
					color={isActive ? "#66ccff" : "#3399ff"}
					emissive={isActive ? "#00aaff" : "#0066cc"}
					emissiveIntensity={isActive ? 1 : 0.5}
					transparent={true}
					opacity={isActive ? 0.9 : 0.7}
				/>
			</mesh>

			{/* Chevrons */}
			{Array.from({ length: 9 }).map((_, i) => {
				const angle = (i * (360 / 9) * Math.PI) / 180;
				return (
					<mesh
						key={`chevron-${i}`}
						position={[
							Math.sin(angle) * 3.2,
							Math.cos(angle) * 3.2,
							0.1
						]}
						rotation={[0, 0, -angle - Math.PI / 2]}
					>
						<coneGeometry args={[0.4, 0.6, 3]} />
						<meshStandardMaterial
							color={isActive && i < 7 ? "#ff6600" : "#cc3300"}
							emissive={isActive && i < 7 ? "#ff3300" : "#00000"}
							emissiveIntensity={isActive && i < 7 ? 0.8 : 0}
						/>
					</mesh>
				);
			})}
		</group>
	);
};

export default Stargate;
