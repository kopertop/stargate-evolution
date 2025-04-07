import React, { forwardRef } from 'react';
import * as THREE from 'three';

interface CharacterProps {
	color?: string;
}

export const Character = forwardRef<THREE.Group, CharacterProps>((props, ref) => {
	const { color = '#4287f5' } = props;

	return (
		<group ref={ref} {...props}>
			{/* Body */}
			<mesh position={[0, 1.1, 0]} castShadow>
				<capsuleGeometry args={[0.25, 1, 8, 16]} />
				<meshStandardMaterial color={color} />
			</mesh>

			{/* Head */}
			<mesh position={[0, 1.9, 0]} castShadow>
				<sphereGeometry args={[0.25, 16, 16]} />
				<meshStandardMaterial color={color} />
			</mesh>

			{/* Eyes */}
			<mesh position={[0.08, 1.95, 0.18]} castShadow>
				<sphereGeometry args={[0.05, 8, 8]} />
				<meshStandardMaterial color="#ffffff" />
			</mesh>
			<mesh position={[-0.08, 1.95, 0.18]} castShadow>
				<sphereGeometry args={[0.05, 8, 8]} />
				<meshStandardMaterial color="#ffffff" />
			</mesh>

			{/* Pupils */}
			<mesh position={[0.08, 1.95, 0.22]} castShadow>
				<sphereGeometry args={[0.02, 8, 8]} />
				<meshStandardMaterial color="#000000" />
			</mesh>
			<mesh position={[-0.08, 1.95, 0.22]} castShadow>
				<sphereGeometry args={[0.02, 8, 8]} />
				<meshStandardMaterial color="#000000" />
			</mesh>

			{/* Arms */}
			<mesh position={[0.35, 1.1, 0]} rotation={[0, 0, -Math.PI / 16]} castShadow>
				<capsuleGeometry args={[0.08, 0.7, 8, 8]} />
				<meshStandardMaterial color={color} />
			</mesh>
			<mesh position={[-0.35, 1.1, 0]} rotation={[0, 0, Math.PI / 16]} castShadow>
				<capsuleGeometry args={[0.08, 0.7, 8, 8]} />
				<meshStandardMaterial color={color} />
			</mesh>

			{/* Legs */}
			<mesh position={[0.15, 0.5, 0]} castShadow>
				<capsuleGeometry args={[0.1, 0.7, 8, 8]} />
				<meshStandardMaterial color={color} />
			</mesh>
			<mesh position={[-0.15, 0.5, 0]} castShadow>
				<capsuleGeometry args={[0.1, 0.7, 8, 8]} />
				<meshStandardMaterial color={color} />
			</mesh>
		</group>
	);
});

Character.displayName = 'Character';
