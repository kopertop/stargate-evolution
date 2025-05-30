import React from 'react';

import { DoorInfo } from '../types';
import { RoomType } from '../types/model-types';
import { getDoorPosition } from '../utils/grid-system';

import { DoorSvg, DoorLight, DoorOrientation } from './door-svg';

interface ShipDoorsProps {
	rooms: RoomType[];
	onDoorClick: (fromRoomId: string, toRoomId: string) => void;
}

interface DoorConnection {
	fromRoom: RoomType;
	toRoom: RoomType;
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

		for (const room of rooms) {
			if (!room.found) continue; // Only render doors for discovered rooms

			for (const doorInfo of room.doors) {
				const toRoom = rooms.find((r) => r.id === doorInfo.toRoomId);
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

	// Get door light state based on conditions
	const getDoorLight = (connection: DoorConnection): DoorLight => {
		const { fromRoom, toRoom, doorInfo } = connection;

		if (doorInfo.state === 'locked') {
			return 'locked';
		}

		if (fromRoom.status !== 'ok' || toRoom.status !== 'ok') {
			return 'inaccessible';
		}

		return 'normal';
	};

	// Calculate door position between two rooms using the grid system
	const calculateDoorPosition = (fromRoom: RoomType, toRoom: RoomType) => {
		const doorPos = getDoorPosition(fromRoom, toRoom);

		if (!doorPos) {
			// No valid connection - shouldn't happen but fallback gracefully
			console.warn(`No valid door position found between ${fromRoom.type} and ${toRoom.type}`);
			return null;
		}

		// Determine rotation based on the connection side
		const orientationMap: Record<string, DoorOrientation> = {
			top: 'north',
			bottom: 'south',
			left: 'west',
			right: 'east',
		};

		return {
			x: doorPos.screenX,
			y: doorPos.screenY,
			orientation: orientationMap[doorPos.side],
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
				const light = getDoorLight(connection);
				const position = calculateDoorPosition(fromRoom, toRoom);

				// Skip if no valid position found
				if (!position) {
					return null;
				}

				return (
					<DoorSvg
						key={`door-${fromRoom.id}-${toRoom.id}`}
						x={position.x}
						y={position.y}
						orientation={position.orientation}
						open={connection.doorInfo.state === 'opened'}
						light={light}
						onClick={() => handleDoorClick(connection)}
					/>
				);
			})}
		</g>
	);
};
