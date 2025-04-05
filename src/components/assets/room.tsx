import React from 'react';

interface RoomProps {
	size?: [number, number];  // [width, depth]
	wallHeight?: number;
	wallColor?: string;
	floorColor?: string;
}

const Room: React.FC<RoomProps> = ({
	size = [20, 20],
	wallHeight = 5,
	wallColor = '#777777',
	floorColor = '#555555'
}) => {
	const [width, depth] = size;
	const halfWidth = width / 2;
	const halfDepth = depth / 2;

	return (
		<group>
			{/* Floor */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
				<planeGeometry args={[width, depth]} />
				<meshStandardMaterial color={floorColor} />
			</mesh>

			{/* Back wall */}
			<mesh position={[0, wallHeight / 2, -halfDepth]}>
				<boxGeometry args={[width, wallHeight, 0.5]} />
				<meshStandardMaterial color={wallColor} />
			</mesh>

			{/* Left wall */}
			<mesh position={[-halfWidth, wallHeight / 2, 0]}>
				<boxGeometry args={[0.5, wallHeight, depth]} />
				<meshStandardMaterial color={wallColor} />
			</mesh>

			{/* Right wall */}
			<mesh position={[halfWidth, wallHeight / 2, 0]}>
				<boxGeometry args={[0.5, wallHeight, depth]} />
				<meshStandardMaterial color={wallColor} />
			</mesh>
		</group>
	);
};

export default Room;
