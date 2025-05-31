import type { DoorInfo, RoomTemplate } from '@stargate/common';
import React from 'react';

import { getDoorPosition, WALL_THICKNESS, DOOR_SIZE } from '../utils/grid-system';

interface RoomWithDoors extends RoomTemplate {
	doors?: string | any[];
}

interface ShipDoorsProps {
	rooms: RoomTemplate[];
	onDoorClick: (fromRoomId: string, toRoomId: string) => void;
}

interface DoorConnection {
	fromRoom: RoomTemplate;
	toRoom: RoomTemplate;
	doorInfo: DoorInfo;
}

export const ShipDoors: React.FC<ShipDoorsProps> = ({
	rooms,
	onDoorClick,
}) => {
	// Get all unique door connections (prevent duplicates)
	const getDoorConnections = (): DoorConnection[] => {
		const connections: DoorConnection[] = [];
		const processedPairs = new Set<string>();

		for (const room of rooms as RoomWithDoors[]) {
			for (const doorInfo of Array.isArray(room.doors) ? room.doors : room.doors ? JSON.parse(room.doors) : []) {
				const toRoomId = doorInfo.toRoomId || doorInfo.to_room_id;
				const toRoom = rooms.find((r) => r.id === toRoomId);
				// Only render if EITHER room is found
				if (!(room.found || (toRoom && toRoom.found))) continue;
				if (!toRoom) continue;

				// Create a deterministic pair ID to prevent duplicates
				const pairId = [room.id, toRoom.id].sort().join('-');

				if (!processedPairs.has(pairId)) {
					processedPairs.add(pairId);
					connections.push({
						fromRoom: room,
						toRoom,
						doorInfo,
					});
				}
			}
		}

		return connections;
	};

	// Get door image based on state and safety
	const getDoorImage = (connection: DoorConnection): string => {
		const { fromRoom, toRoom, doorInfo } = connection;

		switch (doorInfo.state) {
		case 'opened':
			return '/images/doors/door-opened.png';
		case 'closed':
			// Check if door should be restricted (unsafe conditions)
			if ((fromRoom.status === 'damaged' || toRoom.status === 'damaged' ||
				fromRoom.status === 'destroyed' || toRoom.status === 'destroyed')) {
				return '/images/doors/door-restricted.png';
			}
			return '/images/doors/door-closed.png';
		case 'locked': {
			// Check if this is a dangerous door (red) or code-locked door (gold)
			if (toRoom.status === 'damaged' || toRoom.status === 'destroyed') {
				// Red door for dangerous rooms
				return '/images/doors/door-locked.png';
			}

			// Check if door has code requirements (gold door)
			const hasCodeRequirement = doorInfo.requirements?.some((req: any) => req.type === 'code');
			if (hasCodeRequirement) {
				return '/images/doors/door-restricted.png'; // Gold door for code access
			}

			// Default locked door (red)
			return '/images/doors/door-locked.png';
		}
		default:
			return '/images/doors/door-closed.png';
		}
	};

	// Calculate door position between two rooms using the grid system
	const calculateDoorPosition = (fromRoom: RoomTemplate, toRoom: RoomTemplate) => {
		const doorPos = getDoorPosition(fromRoom, toRoom);

		if (!doorPos) {
			// No valid connection - shouldn't happen but fallback gracefully
			console.warn(`No valid door position found between ${fromRoom.type} and ${toRoom.type}`);
			return null;
		}

		// Determine rotation based on the connection side
		let rotation = 0;
		if (doorPos.side === 'left' || doorPos.side === 'right') {
			rotation = 90;
		}

		return {
			x: doorPos.screenX,
			y: doorPos.screenY,
			rotation,
			side: doorPos.side,
		};
	};

	// Handle door click
	const handleDoorClick = (connection: DoorConnection) => {
		onDoorClick(connection.fromRoom.id, connection.toRoom.id);
	};

	const doorConnections = getDoorConnections();

	return (
		<g>
			{doorConnections.map((connection, index) => {
				const { fromRoom, toRoom } = connection;
				const doorImage = getDoorImage(connection);
				const position = calculateDoorPosition(fromRoom, toRoom);

				// Skip if no valid position found
				if (!position) {
					return null;
				}

				return (
					<g key={`door-${fromRoom.id}-${toRoom.id}`}>
						<rect
							x={position.x - DOOR_SIZE / 2 - 2}
							y={position.y - WALL_THICKNESS / 2 - 2}
							width={DOOR_SIZE + 4}
							height={WALL_THICKNESS + 4}
							fill="none"
							stroke="red"
							strokeWidth={3}
						/>
						<image
							href={doorImage}
							x={position.x - DOOR_SIZE / 2}
							y={position.y - WALL_THICKNESS / 2}
							width={DOOR_SIZE}
							height={WALL_THICKNESS}
							style={{ cursor: 'pointer', opacity: 0.7 }}
							onClick={() => handleDoorClick(connection)}
							transform={position.rotation !== 0 ?
								`rotate(${position.rotation} ${position.x} ${position.y})` :
								undefined
							}
						/>
					</g>
				);
			})}
		</g>
	);
};
