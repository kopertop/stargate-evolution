import React from 'react';
import * as THREE from 'three';

export default function StargateRoom() {
	return (
		<>
			{/* Floor */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
				<planeGeometry args={[20, 20]} />
				<meshStandardMaterial color="#444" roughness={0.7} />
			</mesh>

			{/* Walls */}
			<group>
				{/* Back wall */}
				<mesh position={[0, 5, -10]} receiveShadow castShadow>
					<boxGeometry args={[20, 10, 0.5]} />
					<meshStandardMaterial color="#666" />
				</mesh>

				{/* Left wall */}
				<mesh position={[-10, 5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
					<boxGeometry args={[20, 10, 0.5]} />
					<meshStandardMaterial color="#666" />
				</mesh>

				{/* Right wall */}
				<mesh position={[10, 5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
					<boxGeometry args={[20, 10, 0.5]} />
					<meshStandardMaterial color="#666" />
				</mesh>
			</group>

			{/* Stargate */}
			<group position={[0, 3, -9]}>
				{/* Outer ring */}
				<mesh castShadow>
					<torusGeometry args={[3, 0.5, 16, 32]} />
					<meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
				</mesh>

				{/* Inner ring with "event horizon" */}
				<mesh position={[0, 0, 0.1]}>
					<circleGeometry args={[2.5, 32]} />
					<meshStandardMaterial
						color="#3498db"
						emissive="#2980b9"
						emissiveIntensity={0.5}
						side={THREE.DoubleSide}
						transparent
						opacity={0.8}
					/>
				</mesh>

				{/* Chevrons */}
				{Array(9).fill(0).map((_, index) => {
					const angle = (index * (Math.PI * 2)) / 9;
					const x = Math.sin(angle) * 3;
					const y = Math.cos(angle) * 3;

					return (
						<mesh
							key={index}
							position={[x, y, 0.2]}
							rotation={[0, 0, -angle]}
							castShadow
						>
							<boxGeometry args={[0.8, 0.4, 0.3]} />
							<meshStandardMaterial color="#b93226" emissive="#ff5e57" emissiveIntensity={0.2} />
						</mesh>
					);
				})}
			</group>

			{/* DHD (Dial Home Device) */}
			<group position={[0, 1, -5]}>
				<mesh castShadow>
					<coneGeometry args={[1.5, 2, 16]} />
					<meshStandardMaterial color="#555" />
				</mesh>

				{/* DHD top surface */}
				<mesh position={[0, 1, 0]} rotation={[-Math.PI / 4, 0, 0]}>
					<circleGeometry args={[1.2, 32]} />
					<meshStandardMaterial color="#333" />
				</mesh>

				{/* Center crystal */}
				<mesh position={[0, 1.2, 0.3]} castShadow>
					<sphereGeometry args={[0.3, 16, 16]} />
					<meshStandardMaterial color="#ff5e57" emissive="#ff5e57" emissiveIntensity={0.5} />
				</mesh>
			</group>
		</>
	);
}
