import React, { forwardRef } from 'react';
import * as THREE from 'three';

const Character = forwardRef<THREE.Group>((props, ref) => {
	return (
		<group ref={ref} position={[0, 1, 5]}>
			{/* Body */}
			<mesh castShadow position={[0, 0, 0]}>
				<capsuleGeometry args={[0.5, 1, 4, 8]} />
				<meshStandardMaterial color="#2370c6" />
			</mesh>

			{/* Head */}
			<mesh castShadow position={[0, 1, 0]}>
				<sphereGeometry args={[0.4, 16, 16]} />
				<meshStandardMaterial color="#f0c090" />
			</mesh>

			{/* Eyes */}
			<mesh position={[0.2, 1.1, 0.3]}>
				<sphereGeometry args={[0.1, 8, 8]} />
				<meshStandardMaterial color="#000000" />
			</mesh>
			<mesh position={[-0.2, 1.1, 0.3]}>
				<sphereGeometry args={[0.1, 8, 8]} />
				<meshStandardMaterial color="#000000" />
			</mesh>
		</group>
	);
});

Character.displayName = 'Character';

export default Character;
