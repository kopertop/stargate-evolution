import React, { useState } from 'react';

import type { Room } from '../types';

interface DoorState {
	[doorId: string]: boolean; // true = opened, false = closed
}

interface ShipDoorProps {
	fromRoom: Room;
	toRoom: Room;
	doorStates: DoorState;
	onDoorClick: (fromRoomId: string, toRoomId: string) => void;
}

export const ShipDoor: React.FC<ShipDoorProps> = ({
	fromRoom,
	toRoom,
	doorStates,
	onDoorClick,
}) => {
	const [isHovered, setIsHovered] = useState(false);

	// Calculate door position between the two rooms
	const getDoorPosition = () => {
		const midX = (fromRoom.x + toRoom.x) / 2;
		const midY = (fromRoom.y + toRoom.y) / 2;
		return { x: midX, y: midY };
	};

	// Get door color based on room safety
	const getDoorColor = (): string => {
		// Both rooms must be unlocked to determine door safety
		if (!fromRoom.unlocked || !toRoom.unlocked) {
			return '#fbbf24'; // Yellow for unknown
		}

		// Check for atmospheric or structural hazards
		if (fromRoom.status === 'damaged' || toRoom.status === 'damaged') {
			return '#ef4444'; // Red for unsafe
		}

		if (fromRoom.status === 'destroyed' || toRoom.status === 'destroyed') {
			return '#ef4444'; // Red for unsafe
		}

		return '#10b981'; // Green for safe
	};

	// Get door state
	const getDoorState = (): 'opened' | 'closed' | 'locked' => {
		const doorKey = `${fromRoom.id}-${toRoom.id}`;
		const reverseDoorKey = `${toRoom.id}-${fromRoom.id}`;

		if (doorStates[doorKey] || doorStates[reverseDoorKey]) {
			return 'opened';
		}

		// Check if either room is locked
		if (!fromRoom.unlocked || !toRoom.unlocked) {
			return 'locked';
		}

		return 'closed';
	};

	// Get door image based on state and safety
	const getDoorImage = (): string => {
		const doorState = getDoorState();
		const doorColor = getDoorColor();

		if (doorState === 'opened') {
			return '/images/door-opened.png';
		} else if (doorColor === '#ef4444') {
			return '/images/door-red.png';
		}

		return '/images/door.png';
	};

	// Only render if both rooms are visible
	if (!fromRoom.unlocked && !toRoom.unlocked) {
		return null;
	}

	const position = getDoorPosition();
	const doorState = getDoorState();

	return (
		<g>
			{/* Door image */}
			<image
				href={getDoorImage()}
				x={position.x - 16}
				y={position.y - 16}
				width="32"
				height="32"
				opacity="0.9"
				style={{ cursor: doorState !== 'locked' ? 'pointer' : 'default' }}
				onClick={() => {
					if (doorState !== 'locked') {
						onDoorClick(fromRoom.id, toRoom.id);
					}
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			/>

			{/* Door status indicator */}
			{isHovered && (
				<g>
					{/* Background for text */}
					<rect
						x={position.x - 30}
						y={position.y - 40}
						width="60"
						height="20"
						fill="#000000"
						opacity="0.8"
						rx="4"
						ry="4"
					/>
					{/* Door status text */}
					<text
						x={position.x}
						y={position.y - 26}
						textAnchor="middle"
						fill="#ffffff"
						fontSize="12"
						fontWeight="bold"
					>
						{doorState.toUpperCase()}
					</text>
				</g>
			)}
		</g>
	);
};
