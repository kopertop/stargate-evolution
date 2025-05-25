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
		// If either room is not found (undiscovered), door is unknown
		if (!fromRoom.found || !toRoom.found) {
			return '#fbbf24'; // Yellow for unknown/undiscovered
		}

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

		// If either room is not found (undiscovered), door should be locked
		if (!fromRoom.found || !toRoom.found) {
			return 'locked';
		}

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

		// Calculate connecting walls between rooms
	const getConnectingWalls = () => {
		const position = getDoorPosition();
		const dx = toRoom.x - fromRoom.x;
		const dy = toRoom.y - fromRoom.y;
		const isHorizontal = Math.abs(dx) > Math.abs(dy);

		const wallThickness = 8;
		const doorWidth = 32;
		const walls: Array<{ x: number; y: number; width: number; height: number }> = [];

				if (isHorizontal) {
			// Horizontal connection between rooms
			const wallThickness = 8;
			let corridorStartX: number;
			let corridorEndX: number;

						if (dx > 0) {
				// toRoom is to the right of fromRoom
				// Start corridor exactly where fromRoom's right wall ends
				corridorStartX = fromRoom.x + fromRoom.width / 2;
				// End corridor exactly where toRoom's left wall begins
				corridorEndX = toRoom.x - toRoom.width / 2;
			} else {
				// toRoom is to the left of fromRoom
				// Start corridor exactly where toRoom's right wall ends
				corridorStartX = toRoom.x + toRoom.width / 2;
				// End corridor exactly where fromRoom's left wall begins
				corridorEndX = fromRoom.x - fromRoom.width / 2;
			}

			const corridorLength = corridorEndX - corridorStartX;

			// Only render corridor walls if there's actually space between rooms
			if (corridorLength > 0) {
				// Top wall of corridor (above door)
				walls.push({
					x: corridorStartX,
					y: position.y - doorWidth / 2 - wallThickness,
					width: corridorLength,
					height: wallThickness,
				});

				// Bottom wall of corridor (below door)
				walls.push({
					x: corridorStartX,
					y: position.y + doorWidth / 2,
					width: corridorLength,
					height: wallThickness,
				});
			}
		} else {
			// Vertical connection between rooms
			const wallThickness = 8;
			let corridorStartY: number;
			let corridorEndY: number;

			if (dy > 0) {
				// toRoom is below fromRoom
				// Start corridor exactly where fromRoom's bottom wall ends
				corridorStartY = fromRoom.y + fromRoom.height / 2;
				// End corridor exactly where toRoom's top wall begins
				corridorEndY = toRoom.y - toRoom.height / 2;
			} else {
				// toRoom is above fromRoom
				// Start corridor exactly where toRoom's bottom wall ends
				corridorStartY = toRoom.y + toRoom.height / 2;
				// End corridor exactly where fromRoom's top wall begins
				corridorEndY = fromRoom.y - fromRoom.height / 2;
			}

			const corridorLength = corridorEndY - corridorStartY;

			// Only render corridor walls if there's actually space between rooms
			if (corridorLength > 0) {
				// Left wall of corridor (left of door)
				walls.push({
					x: position.x - doorWidth / 2 - wallThickness,
					y: corridorStartY,
					width: wallThickness,
					height: corridorLength,
				});

				// Right wall of corridor (right of door)
				walls.push({
					x: position.x + doorWidth / 2,
					y: corridorStartY,
					width: wallThickness,
					height: corridorLength,
				});
			}
		}

		return walls;
	};

	// Only render if at least one room is found (visible)
	if (!fromRoom.found && !toRoom.found) {
		return null;
	}

	const position = getDoorPosition();
	const doorState = getDoorState();
	const connectingWalls = getConnectingWalls();

	return (
		<g>
			{/* Wall pattern definition */}
			<defs>
				<pattern
					id={`wall-pattern-door-${fromRoom.id}-${toRoom.id}`}
					patternUnits="userSpaceOnUse"
					width="32"
					height="32"
				>
					<image
						href="/images/wall.png"
						x="0"
						y="0"
						width="32"
						height="32"
					/>
				</pattern>
			</defs>

			{/* Connecting walls */}
			{connectingWalls.map((wall, index) => (
				<rect
					key={index}
					x={wall.x}
					y={wall.y}
					width={wall.width}
					height={wall.height}
					fill={`url(#wall-pattern-door-${fromRoom.id}-${toRoom.id})`}
					opacity="0.9"
				/>
			))}

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
