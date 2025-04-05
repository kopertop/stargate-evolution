import React from 'react';
import * as THREE from 'three';

const StargateRoom: React.FC = () => {
	return (
		<group>
			{/* Floor */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
				<planeGeometry args={[20, 20]} />
				<meshStandardMaterial color="#555555" />
			</mesh>

			{/* Walls that match our collision boundaries */}
			{/* Back wall */}
			<mesh position={[0, 2.5, -10]}>
				<boxGeometry args={[20, 5, 0.5]} />
				<meshStandardMaterial color="#777777" />
			</mesh>

			{/* Left wall */}
			<mesh position={[-10, 2.5, 0]}>
				<boxGeometry args={[0.5, 5, 20]} />
				<meshStandardMaterial color="#777777" />
			</mesh>

			{/* Right wall */}
			<mesh position={[10, 2.5, 0]}>
				<boxGeometry args={[0.5, 5, 20]} />
				<meshStandardMaterial color="#777777" />
			</mesh>

			{/* Stargate */}
			<group position={[0, 2.5, -9]}>
				{/* Outer ring */}
				<mesh>
					<torusGeometry args={[3, 0.5, 16, 32]} />
					<meshStandardMaterial color="#444444" />
				</mesh>

				{/* Inner part (event horizon placeholder) */}
				<mesh>
					<circleGeometry args={[2.5, 32]} />
					<meshStandardMaterial
						color="#3399ff"
						emissive="#0066cc"
						emissiveIntensity={0.5}
						transparent={true}
						opacity={0.7}
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
							<meshStandardMaterial color="#cc3300" />
						</mesh>
					);
				})}
			</group>

			{/* DHD (Dial Home Device) */}
			<group position={[0, 1, -5]}>
				{/* Base */}
				<mesh position={[0, 0, 0]}>
					<cylinderGeometry args={[1.5, 2, 1, 16]} />
					<meshStandardMaterial color="#555555" />
				</mesh>

				{/* Console top */}
				<mesh position={[0, 0.5, 0]} rotation={[0.5, 0, 0]}>
					<cylinderGeometry args={[1.2, 1.5, 0.3, 16]} />
					<meshStandardMaterial color="#333333" />
				</mesh>

				{/* Center control crystal */}
				<mesh position={[0, 0.7, 0]} rotation={[0.5, 0, 0]}>
					<sphereGeometry args={[0.3, 16, 16]} />
					<meshStandardMaterial
						color="#ff3300"
						emissive="#ff3300"
						emissiveIntensity={0.5}
					/>
				</mesh>
			</group>

			{/* Room lighting */}
			<pointLight position={[0, 4, 0]} intensity={0.5} />
			<pointLight position={[0, 4, -5]} intensity={0.3} />
			<pointLight position={[0, 4, -9]} intensity={0.3} color="#66ccff" />
		</group>
	);
};

export default StargateRoom;
