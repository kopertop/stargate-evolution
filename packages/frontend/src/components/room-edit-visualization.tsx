import { type RoomTemplate } from '@stargate/common';
import React, { useMemo, useState } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FaPlus, FaMinus, FaExpand } from 'react-icons/fa';

import { calculateRoomPositions, getRoomScreenPosition, GRID_UNIT, WALL_THICKNESS, DOOR_SIZE } from '../utils/grid-system';

interface RoomEditVisualizationProps {
	room: RoomTemplate | null;
	allRooms: RoomTemplate[];
	onRoomClick: (room: RoomTemplate) => void;
	onAddConnectingRoom?: (direction: 'north' | 'south' | 'east' | 'west') => void;
}

export const RoomEditVisualization: React.FC<RoomEditVisualizationProps> = ({
	room,
	allRooms,
	onRoomClick,
	onAddConnectingRoom,
}) => {
	// Zoom and pan state
	const [zoomLevel, setZoomLevel] = useState(1);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

	// Get all rooms on the same floor as the selected room
	const floorRooms = useMemo(() => {
		if (!room) return [];
		return allRooms.filter(r => r.floor === room.floor);
	}, [room, allRooms]);

	// Calculate positions for all rooms on the floor, centering on the selected room
	const roomPositions = useMemo(() => {
		if (!room || !floorRooms.length) return {};
		return calculateRoomPositions(floorRooms, room.id);
	}, [room, floorRooms]);

	// Get connected rooms for the selected room
	const connectedRooms = useMemo(() => {
		if (!room) return [];

		const connections = [];
		const connectionFields = ['connection_north', 'connection_south', 'connection_east', 'connection_west'] as const;

		for (const field of connectionFields) {
			const connectedRoomId = room[field];
			if (connectedRoomId) {
				const connectedRoom = floorRooms.find(r => r.id === connectedRoomId);
				if (connectedRoom) {
					connections.push(connectedRoom);
				}
			}
		}

		// Also check for reverse connections (other rooms connecting to this one)
		for (const otherRoom of floorRooms) {
			if (otherRoom.id === room.id) continue;

			for (const field of connectionFields) {
				if (otherRoom[field] === room.id && !connections.find(r => r.id === otherRoom.id)) {
					connections.push(otherRoom);
				}
			}
		}

		return connections;
	}, [room, floorRooms]);

	// Get all rooms to display (all rooms on the same floor)
	const roomsToDisplay = useMemo(() => {
		if (!room) return [];
		return floorRooms;
	}, [floorRooms]);

	// Calculate content bounds (including potential connections)
	const contentBounds = useMemo(() => {
		if (!roomsToDisplay.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };

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

		// Include potential connection areas in the bounds
		if (room && onAddConnectingRoom) {
			const roomPosition = getRoomScreenPosition(room, roomPositions);
			const roomWidth = room.width * GRID_UNIT;
			const roomHeight = room.height * GRID_UNIT;
			const spacing = GRID_UNIT * 0.5;

			// Check bounds for potential connections
			const potentialBounds = [
				{ x: roomPosition.x, y: roomPosition.y - roomHeight / 2 - spacing - roomHeight / 2 }, // north
				{ x: roomPosition.x, y: roomPosition.y + roomHeight / 2 + spacing + roomHeight / 2 }, // south
				{ x: roomPosition.x + roomWidth / 2 + spacing + roomWidth / 2, y: roomPosition.y }, // east
				{ x: roomPosition.x - roomWidth / 2 - spacing - roomWidth / 2, y: roomPosition.y }, // west
			];

			for (const bound of potentialBounds) {
				minX = Math.min(minX, bound.x - roomWidth / 2);
				maxX = Math.max(maxX, bound.x + roomWidth / 2);
				minY = Math.min(minY, bound.y - roomHeight / 2);
				maxY = Math.max(maxY, bound.y + roomHeight / 2);
			}
		}

		const width = maxX - minX;
		const height = maxY - minY;

		return { minX, maxX, minY, maxY, width, height };
	}, [roomsToDisplay, roomPositions, room, onAddConnectingRoom]);

	// Calculate zoom-to-fit level
	const zoomToFitLevel = useMemo(() => {
		if (contentBounds.width === 0 || contentBounds.height === 0) return 1;

		// Target container size for zoom-to-fit calculation
		const containerWidth = 800;
		const containerHeight = 500;
		const padding = 80; // Extra padding around content

		const scaleX = (containerWidth - padding * 2) / contentBounds.width;
		const scaleY = (containerHeight - padding * 2) / contentBounds.height;

		// Use the smaller scale to ensure content fits in both dimensions
		const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom for readability
		return Math.max(scale, 0.2); // Minimum 0.2x zoom
	}, [contentBounds]);

	// Auto zoom-to-fit when room changes (only on initial load)
	React.useEffect(() => {
		setZoomLevel(zoomToFitLevel);
		setPanOffset({ x: 0, y: 0 });
	}, [zoomToFitLevel]); // Only zoom to fit when zoom calculation changes, not when room changes

	// Re-center when room changes but keep current zoom
	React.useEffect(() => {
		setPanOffset({ x: 0, y: 0 });
	}, [room?.id, room?.floor]);

	// Calculate current view bounds based on zoom and pan, centered on focused room
	const viewBounds = useMemo(() => {
		if (!room) return { x: 0, y: 0, width: 800, height: 400 };

		const padding = 30;

		// Center on the focused room position, not the overall content bounds
		const focusedRoomPosition = getRoomScreenPosition(room, roomPositions);
		const centerX = focusedRoomPosition.x + panOffset.x;
		const centerY = focusedRoomPosition.y + panOffset.y;

		// Use a fixed viewport size that will be responsive
		const baseViewWidth = 800;
		const baseViewHeight = 500;

		const viewWidth = baseViewWidth / zoomLevel;
		const viewHeight = baseViewHeight / zoomLevel;

		return {
			x: centerX - viewWidth / 2,
			y: centerY - viewHeight / 2,
			width: viewWidth,
			height: viewHeight,
		};
	}, [room, roomPositions, zoomLevel, panOffset]);

	// Render a single room
	const renderRoom = (displayRoom: RoomTemplate, isSelected: boolean) => {
		const position = getRoomScreenPosition(displayRoom, roomPositions);
		const roomWidth = displayRoom.width * GRID_UNIT;
		const roomHeight = displayRoom.height * GRID_UNIT;
		const isConnected = connectedRooms.some(cr => cr.id === displayRoom.id);
		const isClickable = !isSelected; // All rooms except selected are clickable

		// Determine room color based on status
		let fillColor = '#374151'; // Default (unconnected)
		let strokeColor = '#6b7280';

		if (isSelected) {
			fillColor = '#2563eb'; // Blue for selected
			strokeColor = '#3b82f6';
		} else if (isConnected) {
			fillColor = '#059669'; // Green for connected
			strokeColor = '#10b981';
		}

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
					fill={fillColor}
					stroke={strokeColor}
					strokeWidth="2"
					rx="4"
					opacity={isConnected || isSelected ? 1 : 0.6}
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

	// Render potential connection spots where new rooms can be added
	const renderPotentialConnections = () => {
		if (!room || !onAddConnectingRoom) return null;

		const potentialConnections = [];
		const roomPosition = getRoomScreenPosition(room, roomPositions);
		const roomWidth = room.width * GRID_UNIT;
		const roomHeight = room.height * GRID_UNIT;
		const spacing = GRID_UNIT * 0.5; // Gap between rooms

		// Check each direction for potential connections
		const directions = [
			{
				key: 'north',
				connection: room.connection_north,
				x: roomPosition.x,
				y: roomPosition.y - roomHeight / 2 - spacing - roomHeight / 2,
			},
			{
				key: 'south',
				connection: room.connection_south,
				x: roomPosition.x,
				y: roomPosition.y + roomHeight / 2 + spacing + roomHeight / 2,
			},
			{
				key: 'east',
				connection: room.connection_east,
				x: roomPosition.x + roomWidth / 2 + spacing + roomWidth / 2,
				y: roomPosition.y,
			},
			{
				key: 'west',
				connection: room.connection_west,
				x: roomPosition.x - roomWidth / 2 - spacing - roomWidth / 2,
				y: roomPosition.y,
			},
		] as const;

		for (const direction of directions) {
			// Only show potential connection if there's no existing connection
			if (!direction.connection) {
				const potentialWidth = roomWidth;
				const potentialHeight = roomHeight;

				potentialConnections.push(
					<g
						key={`potential-${direction.key}`}
						style={{ cursor: 'pointer' }}
						onClick={() => onAddConnectingRoom(direction.key)}
					>
						{/* Dotted outline */}
						<rect
							x={direction.x - potentialWidth / 2}
							y={direction.y - potentialHeight / 2}
							width={potentialWidth}
							height={potentialHeight}
							fill="none"
							stroke="#6b7280"
							strokeWidth="2"
							strokeDasharray="8,4"
							rx="4"
							opacity="0.6"
						/>

						{/* Hover effect */}
						<rect
							x={direction.x - potentialWidth / 2}
							y={direction.y - potentialHeight / 2}
							width={potentialWidth}
							height={potentialHeight}
							fill="#374151"
							opacity="0"
							rx="4"
							className="potential-connection-hover"
							style={{
								transition: 'opacity 0.2s',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.opacity = '0.3';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.opacity = '0';
							}}
						/>

						{/* Plus icon */}
						<g opacity="0.8">
							<line
								x1={direction.x - 8}
								y1={direction.y}
								x2={direction.x + 8}
								y2={direction.y}
								stroke="#6b7280"
								strokeWidth="2"
							/>
							<line
								x1={direction.x}
								y1={direction.y - 8}
								x2={direction.x}
								y2={direction.y + 8}
								stroke="#6b7280"
								strokeWidth="2"
							/>
						</g>

						{/* Label */}
						<text
							x={direction.x}
							y={direction.y + 20}
							textAnchor="middle"
							fill="#6b7280"
							fontSize="9"
							opacity="0.8"
						>
							Add Room
						</text>
					</g>,
				);
			}
		}

		return potentialConnections;
	};

	// Zoom control functions
	const handleZoomIn = () => {
		setZoomLevel(prev => Math.min(prev * 1.5, 10));
	};

	const handleZoomOut = () => {
		setZoomLevel(prev => Math.max(prev / 1.5, 0.2));
	};

	const handleZoomToFit = () => {
		setZoomLevel(zoomToFitLevel);
		setPanOffset({ x: 0, y: 0 });
	};

	// Pan/drag event handlers
	const handleMouseDown = (e: React.MouseEvent) => {
		// Only start panning if not clicking on an interactive element
		if ((e.target as Element).closest('g[style*="cursor: pointer"]')) {
			return;
		}

		setIsPanning(true);
		setLastPanPoint({ x: e.clientX, y: e.clientY });
		e.preventDefault();
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isPanning) return;

		const deltaX = e.clientX - lastPanPoint.x;
		const deltaY = e.clientY - lastPanPoint.y;

		// Convert screen coordinates to SVG coordinates
		const scale = 1 / zoomLevel;
		setPanOffset(prev => ({
			x: prev.x - deltaX * scale,
			y: prev.y - deltaY * scale,
		}));

		setLastPanPoint({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = () => {
		setIsPanning(false);
	};

	// Mouse wheel zoom handler
	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();

		// Get mouse position relative to SVG
		const svgRect = e.currentTarget.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left;
		const mouseY = e.clientY - svgRect.top;

		// Convert mouse position to SVG coordinates
		const svgMouseX = viewBounds.x + (mouseX / svgRect.width) * viewBounds.width;
		const svgMouseY = viewBounds.y + (mouseY / svgRect.height) * viewBounds.height;

		// Determine zoom direction and factor
		const zoomDirection = e.deltaY > 0 ? -1 : 1; // Negative deltaY = zoom in
		const zoomFactor = 1.05;
		const newZoomLevel = zoomDirection > 0
			? Math.min(zoomLevel * zoomFactor, 10)
			: Math.max(zoomLevel / zoomFactor, 0.2);

		if (newZoomLevel !== zoomLevel && room) {
			// Calculate the zoom center offset to zoom towards mouse cursor
			const zoomRatio = newZoomLevel / zoomLevel;
			const focusedRoomPosition = getRoomScreenPosition(room, roomPositions);

			// Calculate new pan offset to keep mouse position fixed
			const newPanOffsetX = panOffset.x + (svgMouseX - focusedRoomPosition.x) * (1 - 1/zoomRatio);
			const newPanOffsetY = panOffset.y + (svgMouseY - focusedRoomPosition.y) * (1 - 1/zoomRatio);

			setZoomLevel(newZoomLevel);
			setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
		}
	};

	// Global mouse up handler for when mouse leaves SVG area
	React.useEffect(() => {
		const handleGlobalMouseUp = () => setIsPanning(false);
		document.addEventListener('mouseup', handleGlobalMouseUp);
		return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
	}, []);

	if (!room) return null;

	return (
		<div className="h-100 d-flex flex-column" style={{ background: '#000', borderRadius: '8px', padding: '15px' }}>
			<div className="d-flex justify-content-between align-items-center mb-3">
				<h5 className="mb-0" style={{ color: 'white' }}>Room Layout & Connections</h5>
				<div className="d-flex align-items-center gap-3">
					<small style={{ color: '#9ca3af' }}>
						Floor {room?.floor || 0} • {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''} • {connectedRooms.length} connected
					</small>
					<ButtonGroup size="sm">
						<Button
							variant="outline-secondary"
							onClick={handleZoomOut}
							disabled={zoomLevel <= 0.2}
							title="Zoom Out"
						>
							<FaMinus />
						</Button>
						<Button
							variant="outline-secondary"
							onClick={handleZoomToFit}
							title="Zoom to Fit"
						>
							<FaExpand />
						</Button>
						<Button
							variant="outline-secondary"
							onClick={handleZoomIn}
							disabled={zoomLevel >= 10}
							title="Zoom In"
						>
							<FaPlus />
						</Button>
					</ButtonGroup>
				</div>
			</div>
			<div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
				<svg
					width="100%"
					height="100%"
					style={{
						border: '1px solid #374151',
						borderRadius: '4px',
						cursor: isPanning ? 'grabbing' : 'grab',
					}}
					viewBox={`${viewBounds.x} ${viewBounds.y} ${viewBounds.width} ${viewBounds.height}`}
					preserveAspectRatio="xMidYMid meet"
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onWheel={handleWheel}
				>
					{/* Background */}
					<rect
						x={viewBounds.x}
						y={viewBounds.y}
						width={viewBounds.width}
						height={viewBounds.height}
						fill="#111827"
					/>

					{/* Connection lines (render first so they appear behind rooms) */}
					{renderConnections()}

					{/* Potential connection spots */}
					{renderPotentialConnections()}

					{/* Render all rooms */}
					{roomsToDisplay.map(displayRoom =>
						renderRoom(displayRoom, displayRoom.id === room.id),
					)}
				</svg>
				<div className="mt-3 d-flex justify-content-between align-items-center">
					<small style={{ color: '#9ca3af' }}>
						<span style={{ color: '#2563eb' }}>■</span> Current room •
						<span style={{ color: '#10b981' }}> ■</span> Connected rooms •
						<span style={{ color: '#374151' }}> ■</span> Other floor rooms (click to edit) •
						<span style={{ color: '#6b7280' }}> ⬜</span> Add connecting room
					</small>
					<small style={{ color: '#6b7280' }}>
						Zoom: {Math.round(zoomLevel * 100)}%
					</small>
				</div>
			</div>
		</div>
	);
};
