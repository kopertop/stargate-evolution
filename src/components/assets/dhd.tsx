import React from 'react';
import * as THREE from 'three';

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
				position={[0, 1.2, 0.2]}
				rotation={[0.5, 0, 0]}
				onClick={onActivate}
				onPointerOver={() => document.body.style.cursor = 'pointer'}
				onPointerOut={() => document.body.style.cursor = 'auto'}
			>
				<sphereGeometry args={[0.3, 16, 16]} />
				<meshStandardMaterial
					color={isActive ? "#ff6600" : "#ff3300"}
					emissive={isActive ? "#ff6600" : "#ff3300"}
					emissiveIntensity={isActive ? 1 : 0.5}
				/>
			</mesh>
		</group>
	);
};

export default DHD;
