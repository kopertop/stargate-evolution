import { type RoomTemplate } from '@stargate/common';
import React, { useMemo } from 'react';

import { calculateRoomPositions, getRoomScreenPosition, GRID_UNIT, WALL_THICKNESS, DOOR_SIZE } from '../utils/grid-system';

interface RoomEditVisualizationProps {
	room: RoomTemplate | null;
	allRooms: RoomTemplate[];
	onRoomClick: (room: RoomTemplate) => void;
}

export const RoomEditVisualization: React.FC<RoomEditVisualizationProps> = ({
	room,
	allRooms,
	onRoomClick,
}) => {
	// Calculate positions for all rooms, centering on the selected room
	const roomPositions = useMemo(() => {
		if (!room || !allRooms.length) return {};
		return calculateRoomPositions(allRooms, room.id);
	}, [room, allRooms]);

	// Get connected rooms for the selected room
	const connectedRooms = useMemo(() => {
		if (!room) return [];

		const connections = [];
		const connectionFields = ['connection_north', 'connection_south', 'connection_east', 'connection_west'] as const;

		for (const field of connectionFields) {
			const connectedRoomId = room[field];
			if (connectedRoomId) {
				const connectedRoom = allRooms.find(r => r.id === connectedRoomId);
				if (connectedRoom) {
					connections.push(connectedRoom);
				}
			}
		}

		// Also check for reverse connections (other rooms connecting to this one)
		for (const otherRoom of allRooms) {
			if (otherRoom.id === room.id) continue;

			for (const field of connectionFields) {
				if (otherRoom[field] === room.id && !connections.find(r => r.id === otherRoom.id)) {
					connections.push(otherRoom);
				}
			}
		}

		return connections;
	}, [room, allRooms]);

	// Get all rooms to display (selected + connected)
	const roomsToDisplay = useMemo(() => {
		if (!room) return [];
		return [room, ...connectedRooms];
	}, [room, connectedRooms]);

	// Calculate view bounds to center the visualization
	const viewBounds = useMemo(() => {
		if (!roomsToDisplay.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

		for (const displayRoom of roomsToDisplay) {
			const position = getRoomScreenPosition(displayRoom, roomPositions);
			const roomWidth = displayRoom.width * GRID_UNIT;
			const roomHeight = displayRoom.height * GRID_UNIT;

			minX = Math.min(minX, position.x - roomWidth / 2);
			maxX = Math.max(maxX, position.x + roomWidth / 2);
			minY = Math.min(minY, position.y - roomHeight / 2);
			maxY = Math.max(maxY, position.y + roomHeight / 2);
		}

		return { minX, maxX, minY, maxY };
	}, [roomsToDisplay, roomPositions]);

	// Render a single room
	const renderRoom = (displayRoom: RoomTemplate, isSelected: boolean) => {
		const position = getRoomScreenPosition(displayRoom, roomPositions);
		const roomWidth = displayRoom.width * GRID_UNIT;
		const roomHeight = displayRoom.height * GRID_UNIT;
		const isClickable = !isSelected && connectedRooms.some(cr => cr.id === displayRoom.id);

		return (
			<g
				key={displayRoom.id}
				style={{ cursor: isClickable ? 'pointer' : 'default' }}
				onClick={isClickable ? () => onRoomClick(displayRoom) : undefined}
			>
				{/* Room background */}
				<rect
					x={position.x - roomWidth / 2}
					y={position.y - roomHeight / 2}
					width={roomWidth}
					height={roomHeight}
					fill={isSelected ? '#2563eb' : (isClickable ? '#059669' : '#374151')}
					stroke={isSelected ? '#3b82f6' : (isClickable ? '#10b981' : '#6b7280')}
					strokeWidth="2"
					rx="4"
					opacity={isClickable ? 0.8 : 1}
				/>

				{/* Hover effect for clickable rooms */}
				{isClickable && (
					<rect
						x={position.x - roomWidth / 2}
						y={position.y - roomHeight / 2}
						width={roomWidth}
						height={roomHeight}
						fill="white"
						opacity="0"
						rx="4"
						className="room-hover"
						style={{
							transition: 'opacity 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.opacity = '0.2';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.opacity = '0';
						}}
					/>
				)}

				{/* Room walls */}
				{renderRoomWalls(displayRoom, position, roomWidth, roomHeight)}

				{/* Room label */}
				<text
					x={position.x}
					y={position.y - 8}
					textAnchor="middle"
					fill="white"
					fontSize="11"
					fontWeight={isSelected ? 'bold' : 'normal'}
				>
					{displayRoom.name}
				</text>

				{/* Room size */}
				<text
					x={position.x}
					y={position.y + 3}
					textAnchor="middle"
					fill="white"
					fontSize="9"
					opacity="0.8"
				>
					{displayRoom.width}×{displayRoom.height}
				</text>

				{/* Room type */}
				<text
					x={position.x}
					y={position.y + 14}
					textAnchor="middle"
					fill="white"
					fontSize="8"
					opacity="0.6"
				>
					{displayRoom.type}
				</text>

				{/* Click indicator for connected rooms */}
				{isClickable && (
					<text
						x={position.x}
						y={position.y + 25}
						textAnchor="middle"
						fill="#10b981"
						fontSize="8"
						fontWeight="bold"
					>
						Click to edit
					</text>
				)}
			</g>
		);
	};

	// Render walls for a room (simplified version)
	const renderRoomWalls = (displayRoom: RoomTemplate, position: { x: number; y: number }, roomWidth: number, roomHeight: number) => {
		const walls = [];
		const wallThickness = WALL_THICKNESS / 2; // Thinner walls for visualization
		const halfWidth = roomWidth / 2;
		const halfHeight = roomHeight / 2;

		// Check for door openings
		const hasNorthConnection = connectedRooms.some(cr => displayRoom.connection_north === cr.id);
		const hasSouthConnection = connectedRooms.some(cr => displayRoom.connection_south === cr.id);
		const hasEastConnection = connectedRooms.some(cr => displayRoom.connection_east === cr.id);
		const hasWestConnection = connectedRooms.some(cr => displayRoom.connection_west === cr.id);

		// Also check for reverse connections
		const hasNorthReverseConnection = connectedRooms.some(cr => cr.connection_south === displayRoom.id);
		const hasSouthReverseConnection = connectedRooms.some(cr => cr.connection_north === displayRoom.id);
		const hasEastReverseConnection = connectedRooms.some(cr => cr.connection_west === displayRoom.id);
		const hasWestReverseConnection = connectedRooms.some(cr => cr.connection_east === displayRoom.id);

		const doorWidth = DOOR_SIZE / 2; // Smaller doors for compact view

		// Top wall
		if (!hasNorthConnection && !hasNorthReverseConnection) {
			walls.push(
				<rect
					key="wall-top"
					x={position.x - halfWidth}
					y={position.y - halfHeight - wallThickness}
					width={roomWidth}
					height={wallThickness}
					fill="#64748b"
				/>,
			);
		} else {
			// Top wall with door opening
			const doorStart = roomWidth / 2 - doorWidth / 2;
			walls.push(
				<rect
					key="wall-top-left"
					x={position.x - halfWidth}
					y={position.y - halfHeight - wallThickness}
					width={doorStart}
					height={wallThickness}
					fill="#64748b"
				/>,
				<rect
					key="wall-top-right"
					x={position.x - halfWidth + doorStart + doorWidth}
					y={position.y - halfHeight - wallThickness}
					width={roomWidth - doorStart - doorWidth}
					height={wallThickness}
					fill="#64748b"
				/>,
			);
		}

		// Bottom wall
		if (!hasSouthConnection && !hasSouthReverseConnection) {
			walls.push(
				<rect
					key="wall-bottom"
					x={position.x - halfWidth}
					y={position.y + halfHeight}
					width={roomWidth}
					height={wallThickness}
					fill="#64748b"
				/>,
			);
		} else {
			// Bottom wall with door opening
			const doorStart = roomWidth / 2 - doorWidth / 2;
			walls.push(
				<rect
					key="wall-bottom-left"
					x={position.x - halfWidth}
					y={position.y + halfHeight}
					width={doorStart}
					height={wallThickness}
					fill="#64748b"
				/>,
				<rect
					key="wall-bottom-right"
					x={position.x - halfWidth + doorStart + doorWidth}
					y={position.y + halfHeight}
					width={roomWidth - doorStart - doorWidth}
					height={wallThickness}
					fill="#64748b"
				/>,
			);
		}

		// Left wall
		if (!hasWestConnection && !hasWestReverseConnection) {
			walls.push(
				<rect
					key="wall-left"
					x={position.x - halfWidth - wallThickness}
					y={position.y - halfHeight}
					width={wallThickness}
					height={roomHeight}
					fill="#64748b"
				/>,
			);
		} else {
			// Left wall with door opening
			const doorStart = roomHeight / 2 - doorWidth / 2;
			walls.push(
				<rect
					key="wall-left-top"
					x={position.x - halfWidth - wallThickness}
					y={position.y - halfHeight}
					width={wallThickness}
					height={doorStart}
					fill="#64748b"
				/>,
				<rect
					key="wall-left-bottom"
					x={position.x - halfWidth - wallThickness}
					y={position.y - halfHeight + doorStart + doorWidth}
					width={wallThickness}
					height={roomHeight - doorStart - doorWidth}
					fill="#64748b"
				/>,
			);
		}

		// Right wall
		if (!hasEastConnection && !hasEastReverseConnection) {
			walls.push(
				<rect
					key="wall-right"
					x={position.x + halfWidth}
					y={position.y - halfHeight}
					width={wallThickness}
					height={roomHeight}
					fill="#64748b"
				/>,
			);
		} else {
			// Right wall with door opening
			const doorStart = roomHeight / 2 - doorWidth / 2;
			walls.push(
				<rect
					key="wall-right-top"
					x={position.x + halfWidth}
					y={position.y - halfHeight}
					width={wallThickness}
					height={doorStart}
					fill="#64748b"
				/>,
				<rect
					key="wall-right-bottom"
					x={position.x + halfWidth}
					y={position.y - halfHeight + doorStart + doorWidth}
					width={wallThickness}
					height={roomHeight - doorStart - doorWidth}
					fill="#64748b"
				/>,
			);
		}

		return walls;
	};

	// Render connection lines between rooms
	const renderConnections = () => {
		if (!room) return null;

		const connections = [];
		const roomPosition = getRoomScreenPosition(room, roomPositions);

		for (const connectedRoom of connectedRooms) {
			const connectedPosition = getRoomScreenPosition(connectedRoom, roomPositions);

			connections.push(
				<line
					key={`connection-${room.id}-${connectedRoom.id}`}
					x1={roomPosition.x}
					y1={roomPosition.y}
					x2={connectedPosition.x}
					y2={connectedPosition.y}
					stroke="#10b981"
					strokeWidth="1"
					strokeDasharray="3,3"
					opacity="0.5"
				/>,
			);
		}

		return connections;
	};

	if (!room) return null;

	const padding = 30;
	const viewWidth = viewBounds.maxX - viewBounds.minX + (padding * 2);
	const viewHeight = viewBounds.maxY - viewBounds.minY + (padding * 2);
	const viewBoxX = viewBounds.minX - padding;
	const viewBoxY = viewBounds.minY - padding;

	return (
		<div className="h-100 d-flex flex-column" style={{ background: '#000', borderRadius: '8px', padding: '15px' }}>
			<div className="d-flex justify-content-between align-items-center mb-3">
				<h5 className="mb-0" style={{ color: 'white' }}>Room Layout & Connections</h5>
				<small style={{ color: '#9ca3af' }}>
					{connectedRooms.length} connected room{connectedRooms.length !== 1 ? 's' : ''}
				</small>
			</div>
			<div className="flex-grow-1 d-flex flex-column">
				<svg
					width="100%"
					style={{
						flexGrow: 1,
						minHeight: '400px',
						border: '1px solid #374151',
						borderRadius: '4px',
					}}
					viewBox={`${viewBoxX} ${viewBoxY} ${viewWidth} ${viewHeight}`}
					preserveAspectRatio="xMidYMid meet"
				>
					{/* Background */}
					<rect
						x={viewBoxX}
						y={viewBoxY}
						width={viewWidth}
						height={viewHeight}
						fill="#111827"
					/>

					{/* Connection lines (render first so they appear behind rooms) */}
					{renderConnections()}

					{/* Render all rooms */}
					{roomsToDisplay.map(displayRoom =>
						renderRoom(displayRoom, displayRoom.id === room.id),
					)}
				</svg>
				<div className="mt-3">
					<small style={{ color: '#9ca3af' }}>
						<span style={{ color: '#2563eb' }}>■</span> Current room •
						<span style={{ color: '#10b981' }}> ■</span> Connected rooms (click to edit)
					</small>
				</div>
			</div>
		</div>
	);
};
