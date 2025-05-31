import type { DoorInfo, RoomTemplate } from '@stargate/common';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';

import { getDoorPosition, WALL_THICKNESS, DOOR_SIZE, getConnectionSide } from '../utils/grid-system';

import { ShipDoorImage } from './ship-door-image';

interface RoomWithDoors extends RoomTemplate {
	doors?: string | any[];
}

interface ShipDoorsProps {
	rooms: RoomTemplate[];
	onDoorClick: (fromRoomId: string, toRoomId: string) => void;
	roomPosition: Record<string, { gridX: number; gridY: number }>;
}

interface DoorConnection {
	fromRoom: RoomTemplate;
	toRoom: RoomTemplate;
	doorInfo: DoorInfo;
	onDoorClick?: (fromRoomId: string, toRoomId: string) => void;
	roomPosition: Record<string, { gridX: number; gridY: number }>;
}
// Calculate door position between two rooms using the grid system
const calculateDoorPosition = (fromRoom: RoomTemplate, toRoom: RoomTemplate, roomPosition: Record<string, { gridX: number; gridY: number }>) => {
	const doorPos = getDoorPosition(fromRoom, toRoom, roomPosition);

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

export const ShipDoor: React.FC<DoorConnection> = ({
	fromRoom,
	toRoom,
	doorInfo,
	onDoorClick,
	roomPosition,
}: DoorConnection) => {
	const [debugMenu, setDebugMenu] = React.useState(false);
	const [position, setPosition] = React.useState<ReturnType<typeof calculateDoorPosition> | null>(null);

	React.useEffect(() => {
		setPosition(calculateDoorPosition(fromRoom, toRoom, roomPosition));
	}, [fromRoom, toRoom, roomPosition]);

	// Handle door click
	const handleDoorClick = (event: React.MouseEvent) => {
		console.log('[DEBUG] Door clicked:', { fromRoom, toRoom, doorInfo });
		// Check to see if the user is holding down the shift key, if so we'll
		// open a DEBUG menu showing the door connection and the rooms it connects to.
		if (event.shiftKey) {
			// Open a DEBUG menu showing the door connection and the rooms it connects to.
			setDebugMenu(true);
		} else {
			// Standard Door click behavior
			onDoorClick?.(fromRoom.id, toRoom.id);
		}
	};


	return (<>
		{debugMenu && (
			<Modal show={!!debugMenu} onHide={() => setDebugMenu(false)}>
				<Modal.Header>
					<Modal.Title>Debug Menu</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div>From Room: {fromRoom.name} {getConnectionSide(fromRoom, toRoom)}</div>
					<div><code>{fromRoom.id}</code></div>

					<div className="mt-2">To Room: {toRoom.name} {getConnectionSide(toRoom, fromRoom)}</div>
					<div><code>{toRoom.id}</code></div>

					<div className="mt-2">Current State: {doorInfo.state}</div>
					<div className="mt-2">Position: {position?.x}, {position?.y}</div>
					{doorInfo.requirements && (
						<div className="mt-2">Requirements: {doorInfo.requirements.map((req) => (
							<span key={req.type}>{req.type}: {req.value}</span>
						))}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={() => setDebugMenu(false)}>Close</Button>
				</Modal.Footer>
			</Modal>
		)}
		{position && (
			<g key={`door-${fromRoom.id}-${toRoom.id}`}
				transform={position.rotation !== 0 ? `rotate(${position.rotation} ${position.x} ${position.y})` : undefined}
			>
				<g
					style={{ cursor: 'pointer', opacity: 0.7 }}
					transform={`translate(${position.x - DOOR_SIZE / 2}, ${position.y - WALL_THICKNESS / 2})`}
					onClick={handleDoorClick}
				>
					<ShipDoorImage
						state={doorInfo.state}
						isDanger={toRoom.status === 'damaged' || toRoom.status === 'destroyed' || fromRoom.status === 'damaged' || fromRoom.status === 'destroyed'}
						isCodeLocked={!!doorInfo.requirements?.some((req: any) => req.type === 'code')}
						width={DOOR_SIZE}
						height={WALL_THICKNESS}
					/>
				</g>
			</g>
		)}
	</>);
};

export const ShipDoors: React.FC<ShipDoorsProps> = ({
	rooms,
	onDoorClick,
	roomPosition,
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
						roomPosition,
					});
				}
			}
		}

		return connections;
	};




	const doorConnections = getDoorConnections();

	return (
		<g>
			{doorConnections.map((connection) => {
				return <ShipDoor
					key={`${connection.fromRoom.id}-${connection.toRoom.id}-door`}
					{...connection}
					onDoorClick={onDoorClick}
					roomPosition={roomPosition}
				/>;
			})}
		</g>
	);
};
