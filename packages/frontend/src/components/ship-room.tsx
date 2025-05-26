import React, { useState, useRef, useEffect } from 'react';

import type { Room } from '../types';
import { getRoomScreenBounds, getConnectionSide, GRID_UNIT, WALL_THICKNESS, DOOR_SIZE } from '../utils/grid-system';

interface ExplorationProgress {
	roomId: string;
	progress: number; // 0-100
	crewAssigned: string[];
	timeRemaining: number; // in hours
	startTime: number; // timestamp
}

interface DoorState {
	[doorId: string]: boolean; // true = opened, false = closed
}

interface ShipRoomProps {
	room: Room;
	position: { x: number; y: number };
	isVisible: boolean;
	canExplore: boolean;
	exploration?: ExplorationProgress;
	connectedRooms: Room[];
	onRoomClick: (room: Room) => void;
	onDoorClick: (fromRoomId: string, toRoomId: string) => void;
	doorStates: DoorState;
	allRooms: Room[];
}

export const ShipRoom: React.FC<ShipRoomProps> = ({
	room,
	position,
	isVisible,
	canExplore,
	exploration,
	connectedRooms,
	onRoomClick,
	onDoorClick,
	doorStates,
	allRooms,
}) => {
	// State for hover - must be declared before any conditional returns
	const [isHovered, setIsHovered] = useState(false);

	// Don't render if not visible (fog of war)
	if (!isVisible) return null;

	// Calculate room dimensions using grid system
	const getRoomDimensions = () => {
		return {
			width: room.gridWidth * GRID_UNIT,
			height: room.gridHeight * GRID_UNIT,
		};
	};

	const roomDimensions = getRoomDimensions();
	const halfWidth = roomDimensions.width / 2;
	const halfHeight = roomDimensions.height / 2;

	// Get room color - simplified to just show basic room background
	const getRoomColor = (): string => {
		if (exploration) return '#2d1b1b'; // Dark during exploration
		return '#1a1a1a'; // Dark room background
	};


	const getFloorTileImage = () => {
		// Determine floor tile based on room status
		if (!room.found) {
			return '/images/floor-tiles/floor-default.png'; // Dark/unknown - not discovered
		}

		if (room.status === 'damaged' || room.status === 'destroyed') {
			return '/images/floor-tiles/floor-red.png'; // Damaged/dangerous
		}

		if (room.found && !room.explored) {
			// Found but not explored - needs exploration (white tiles)
			return '/images/floor-tiles/floor-white.png';
		}

		if (room.found && room.explored && !room.locked) {
			// Fully explored and operational
			if (room.type === 'gate_room' && room.technology.includes('stargate')) {
				return '/images/floor-tiles/floor-green.png'; // Fully operational stargate
			}
			return '/images/floor-tiles/floor-green.png'; // Fully explored
		}

		return '/images/floor-tiles/floor-default.png'; // Fallback
	};

	const getRoomOverlayImage = () => {
		// Check for room-specific overlay images
		const roomImagePath = `/images/rooms/${room.type}.png`;

		// For now, we'll return the path and let the browser handle 404s
		// In a production app, you might want to check if the file exists
		return roomImagePath;
	};

	// Get door openings for this room (where walls should have gaps)
	const getDoorOpenings = () => {
		const openings: Array<{
			side: 'top' | 'bottom' | 'left' | 'right';
			position: number; // Position along the wall (0-1)
			toRoomId: string; // Add room ID for door identification
		}> = [];

		// Check each door in room.doors to determine where door openings should be
		// This includes doors to undiscovered rooms
		room.doors.forEach(door => {
			// Find the connected room from allRooms (includes undiscovered rooms)
			const connectedRoom = allRooms.find(r => r.id === door.toRoomId);
			if (!connectedRoom) return;

			// Use grid system to determine connection side
			const side = getConnectionSide(room, connectedRoom);
			if (side) {
				openings.push({ side, position: 0.5, toRoomId: door.toRoomId });
			}
		});

		return openings;
	};

	// Helper function to check if there's an opening on a specific side
	const hasOpeningOnSide = (side: 'top' | 'bottom' | 'left' | 'right'): boolean => {
		const openings = getDoorOpenings();
		return openings.some(opening => opening.side === side);
	};

	// Door rendering is now handled by the centralized ShipDoors component

	// Render walls with gaps for door openings
	const renderWalls = () => {
		if (!room.found) return null;

		const openings = getDoorOpenings();
		const wallThickness = WALL_THICKNESS;
		const doorWidth = DOOR_SIZE;

		return (
			<g>
				<defs>
					<pattern
						id={`wall-pattern-${room.id}`}
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

				{/* Corner pieces - only render if no door opening on adjacent sides */}
				{!hasOpeningOnSide('top') && !hasOpeningOnSide('left') && renderCorner(position.x - halfWidth, position.y - halfHeight, 'top-left')}
				{!hasOpeningOnSide('top') && !hasOpeningOnSide('right') && renderCorner(position.x + halfWidth - wallThickness, position.y - halfHeight, 'top-right')}
				{!hasOpeningOnSide('bottom') && !hasOpeningOnSide('left') && renderCorner(position.x - halfWidth, position.y + halfHeight - wallThickness, 'bottom-left')}
				{!hasOpeningOnSide('bottom') && !hasOpeningOnSide('right') && renderCorner(position.x + halfWidth - wallThickness, position.y + halfHeight - wallThickness, 'bottom-right')}

				{/* Top wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y - halfHeight,
					roomDimensions.width,
					wallThickness,
					openings.filter(o => o.side === 'top'),
					'horizontal',
					doorWidth,
				)}

				{/* Bottom wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y + halfHeight - wallThickness,
					roomDimensions.width,
					wallThickness,
					openings.filter(o => o.side === 'bottom'),
					'horizontal',
					doorWidth,
				)}

				{/* Left wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y - halfHeight,
					wallThickness,
					roomDimensions.height,
					openings.filter(o => o.side === 'left'),
					'vertical',
					doorWidth,
				)}

				{/* Right wall */}
				{renderWallSegment(
					position.x + halfWidth - wallThickness,
					position.y - halfHeight,
					wallThickness,
					roomDimensions.height,
					openings.filter(o => o.side === 'right'),
					'vertical',
					doorWidth,
				)}
			</g>
		);
	};

	// Render corner wall pieces
	const renderCorner = (x: number, y: number, corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
		const wallThickness = WALL_THICKNESS;

		return (
			<rect
				x={x}
				y={y}
				width={wallThickness}
				height={wallThickness}
				fill={`url(#wall-pattern-${room.id})`}
				opacity="0.9"
			/>
		);
	};

	// Render a wall segment with doors replacing wall sections where connections exist
	const renderWallSegment = (
		x: number,
		y: number,
		width: number,
		height: number,
		openingsOnThisSide: Array<{ side: string; position: number; toRoomId: string }>,
		orientation: 'horizontal' | 'vertical',
		doorWidth: number,
	) => {
		const elements: JSX.Element[] = [];

		if (openingsOnThisSide.length === 0) {
			// No doors, render full wall
			elements.push(
				<rect
					key="wall-full"
					x={x}
					y={y}
					width={width}
					height={height}
					fill={`url(#wall-pattern-${room.id})`}
					opacity="0.9"
				/>,
			);
		} else {
			// Render wall segments and doors
			if (orientation === 'horizontal') {
				let currentX = x;
				const wallY = y;
				const wallHeight = height;

				openingsOnThisSide.forEach((opening, index) => {
					const doorCenterX = x + (width * opening.position);
					const doorStartX = doorCenterX - doorWidth / 2;
					const doorEndX = doorCenterX + doorWidth / 2;

					// Add wall segment before door
					if (currentX < doorStartX) {
						elements.push(
							<rect
								key={`wall-before-${index}`}
								x={currentX}
								y={wallY}
								width={doorStartX - currentX}
								height={wallHeight}
								fill={`url(#wall-pattern-${room.id})`}
								opacity="0.9"
							/>,
						);
					}

					// Add door gap (no wall segment) - door will be rendered by ShipDoors component
					// Just leave the gap empty

					currentX = doorEndX;
				});

				// Add final wall segment after last door
				if (currentX < x + width) {
					elements.push(
						<rect
							key="wall-after"
							x={currentX}
							y={wallY}
							width={x + width - currentX}
							height={wallHeight}
							fill={`url(#wall-pattern-${room.id})`}
							opacity="0.9"
						/>,
					);
				}
			} else {
				// Vertical wall
				let currentY = y;
				const wallX = x;
				const wallWidth = width;

				openingsOnThisSide.forEach((opening, index) => {
					const doorCenterY = y + (height * opening.position);
					const doorStartY = doorCenterY - doorWidth / 2;
					const doorEndY = doorCenterY + doorWidth / 2;

					// Add wall segment before door
					if (currentY < doorStartY) {
						elements.push(
							<rect
								key={`wall-before-${index}`}
								x={wallX}
								y={currentY}
								width={wallWidth}
								height={doorStartY - currentY}
								fill={`url(#wall-pattern-${room.id})`}
								opacity="0.9"
							/>,
						);
					}

					// Add door gap (no wall segment) - door will be rendered by ShipDoors component
					// Just leave the gap empty

					currentY = doorEndY;
				});

				// Add final wall segment after last door
				if (currentY < y + height) {
					elements.push(
						<rect
							key="wall-after"
							x={wallX}
							y={currentY}
							width={wallWidth}
							height={y + height - currentY}
							fill={`url(#wall-pattern-${room.id})`}
							opacity="0.9"
						/>,
					);
				}
			}
		}

		return <g>{elements}</g>;
	};



	// Render stargate if this is the gate room
	const renderStargate = () => {
		if (room.type !== 'gate_room') return null;

		const isActive = room.technology.includes('stargate') && room.status === 'ok';
		const stargateImage = isActive ? '/images/stargate-active.png' : '/images/stargate.png';

		return (
			<image
				href={stargateImage}
				x={position.x - 60}  // Increased from 30 to 60 for larger size
				y={position.y - 60}  // Increased from 30 to 60 for larger size
				width="120"          // Increased from 60 to 120 for larger size
				height="120"         // Increased from 60 to 120 for larger size
				opacity={room.found ? 1 : 0.6}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			/>
		);
	};

	// Render room type icon (only for non-gate rooms and only if found)
	const renderRoomIcon = () => {
		if (room.type === 'gate_room' || !room.found) return null;

		const iconSize = 32; // Doubled from 16 to 32 for larger rooms

		return (
			<text
				x={position.x}
				y={position.y + 5}
				textAnchor="middle"
				fill="#ffffff"
				fontSize={iconSize}
				pointerEvents="none"
				style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
			>
			</text>
		);
	};

	// Render exploration progress
	const renderExplorationProgress = () => {
		if (!exploration) return null;

		const maxDimension = Math.max(halfWidth, halfHeight);
		const progressRadius = maxDimension + 8; // Use larger dimension for progress ring
		const circumference = 2 * Math.PI * progressRadius;
		const strokeDasharray = `${(exploration.progress / 100) * circumference} ${circumference}`;

		return (
			<g>
				{/* Progress ring */}
				<circle
					cx={position.x}
					cy={position.y}
					r={progressRadius}
					fill="none"
					stroke="#fbbf24"
					strokeWidth="6" // Increased from 4 to 6 for larger visibility
					strokeDasharray={strokeDasharray}
					transform={`rotate(-90 ${position.x} ${position.y})`}
					opacity="0.8"
				/>
				{/* Progress percentage text - centered in the room */}
				<text
					x={position.x}
					y={position.y + 6} // Centered vertically (slight offset for better visual alignment)
					textAnchor="middle"
					fill="#fbbf24"
					fontSize="18" // Increased from 12 to 18
					fontWeight="bold"
					style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
				>
					{Math.round(exploration.progress)}%
				</text>
			</g>
		);
	};

	// Render locked indicator
	const renderLockedIndicator = () => {
		if (!room.found || !room.locked || exploration) return null;

		return (
			<g>
				<circle
					cx={position.x + halfWidth - 12} // Use halfWidth
					cy={position.y - halfHeight + 12} // Use halfHeight
					r="10" // Increased from 6 to 10
					fill="#ef4444"
					stroke="#ffffff"
					strokeWidth="2" // Increased from 1 to 2
				/>
				<text
					data-testid={`locked-indicator: ${JSON.stringify(room)}`}
					x={position.x + halfWidth - 12} // Use halfWidth
					y={position.y - halfHeight + 18} // Use halfHeight
					textAnchor="middle"
					fill="#ffffff"
					fontSize="14" // Increased from 10 to 14
					fontWeight="bold"
				>
					{room.locked ? '🔒' : '?'}
				</text>
			</g>
		);
	};

	// Render hover overlay with room name
	const renderHoverOverlay = () => {
		if (!isHovered) return null;
		// No hover for Corridors
		if (room.type === 'corridor') return null;

		const roomName = room.type.replace('_', ' ').toUpperCase();

		return (
			<g>
				{/* Semi-transparent overlay */}
				<rect
					x={position.x - halfWidth}
					y={position.y - halfHeight}
					width={roomDimensions.width}
					height={roomDimensions.height}
					fill="#000000"
					opacity="0.2"
					rx="4"
					ry="4"
					pointerEvents="none"
				/>
				{/* Centered room name */}
				<text
					x={position.x}
					y={position.y + 5}
					textAnchor="middle"
					fill="#ffffff"
					fontSize="8"
					fontWeight="bold"
					style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
					pointerEvents="none"
				>
					{roomName}
				</text>
			</g>
		);
	};

	return (
		<g>
			{/* Room background image (if found) - tiled pattern */}
			{room.found && (
				<g>
					<defs>
						<pattern
							id={`floor-pattern-${room.id}`}
							patternUnits="userSpaceOnUse"
							width="64"
							height="64"
						>
							<image
								href={getFloorTileImage()}
								x="0"
								y="0"
								width="64"
								height="64"
							/>
						</pattern>
					</defs>
					<rect
						x={position.x - halfWidth}
						y={position.y - halfHeight}
						width={roomDimensions.width}
						height={roomDimensions.height}
						fill={`url(#floor-pattern-${room.id})`}
						opacity="0.8"
						rx="4"
						ry="4"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
					/>
					{/* Room overlay image (if available) */}
					<image
						href={getRoomOverlayImage()}
						x={position.x - 32}
						y={position.y - 32}
						width="64"
						height="64"
						opacity="0.9"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						// eslint-disable-next-line react/no-unknown-property
						onError={(e) => {
							// Hide image if it doesn't exist
							(e.target as SVGImageElement).style.display = 'none';
						}}
					/>
				</g>
			)}

			{/* Room click area (invisible) */}
			<rect
				x={position.x - halfWidth}
				y={position.y - halfHeight}
				width={roomDimensions.width}
				height={roomDimensions.height}
				fill={room.found ? 'transparent' : getRoomColor()}
				stroke="none"
				style={{
					cursor: canExplore ? 'pointer' : 'default',
					filter: room.found ? 'none' : 'brightness(0.6)',
				}}
				onClick={() => onRoomClick(room)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			/>

			{/* Walls with door gaps */}
			{renderWalls()}

			{/* Stargate (for gate room) */}
			{renderStargate()}

			{/* Room type icon */}
			{renderRoomIcon()}

			{/* Exploration progress */}
			{renderExplorationProgress()}

			{/* Locked indicator */}
			{renderLockedIndicator()}

			{/* Room label */}
			{renderHoverOverlay()}

			{/* Fog of war overlay for locked rooms */}
			{room.found && room.locked && (
				<rect
					x={position.x - halfWidth}
					y={position.y - halfHeight}
					width={roomDimensions.width}
					height={roomDimensions.height}
					fill="#000000"
					opacity="0.4"
					pointerEvents="none"
					rx="4"
					ry="4"
				/>
			)}
		</g>
	);
};
