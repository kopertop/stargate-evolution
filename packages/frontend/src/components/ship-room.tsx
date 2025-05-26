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
	const imageRef = useRef<SVGImageElement>(null);

	useEffect(() => {
		const img = imageRef.current;
		if (img) {
			const handleError = () => {
				img.style.display = 'none';
			};
			img.addEventListener('error', handleError);
			return () => img.removeEventListener('error', handleError);
		}
	}, []);

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

	// Get border color - simplified to green/grey only
	const getBorderColor = (): string => {
		if (exploration) return '#fbbf24'; // Orange during exploration
		if (room.unlocked && room.status === 'ok') {
			return '#10b981'; // Green for fully explored and operational
		}
		return '#6b7280'; // Grey for unexplored or damaged
	};

	// Get door color between this room and connected room
	const getDoorColor = (connectedRoom: Room): string => {
		// Both rooms must be unlocked to determine door safety
		if (!room.unlocked || !connectedRoom.unlocked) {
			return '#fbbf24'; // Yellow for unknown
		}

		// Check for atmospheric or structural hazards
		if (room.status === 'damaged' || connectedRoom.status === 'damaged') {
			return '#ef4444'; // Red for unsafe
		}

		if (room.status === 'destroyed' || connectedRoom.status === 'destroyed') {
			return '#ef4444'; // Red for unsafe
		}

		return '#10b981'; // Green for safe
	};

	const getFloorTileImage = () => {
		// Determine floor tile based on room status
		if (!room.unlocked) {
			return '/images/floor-tiles/floor-default.png'; // Dark/unknown
		}

		if (room.status === 'damaged' || room.status === 'destroyed') {
			return '/images/floor-tiles/floor-red.png'; // Damaged/dangerous
		}

		if (room.status === 'ok' && room.unlocked) {
			// Check if fully explored/operational
			if (room.type === 'gate_room' && room.technology.includes('stargate')) {
				return '/images/floor-tiles/floor-green.png'; // Fully operational
			}
			// For other rooms, use white for OK but not fully unlocked/explored
			return '/images/floor-tiles/floor-white.png';
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

	// Get the appropriate door image based on door state and toRoomId
	const getDoorImageForOpening = (toRoomId: string): string => {
		// Find the connected room from allRooms
		const connectedRoom = allRooms.find(r => r.id === toRoomId);

		// Find the door info from room.doors
		const doorInfo = room.doors.find(door => door.toRoomId === toRoomId);

		if (!doorInfo) {
			return '/images/doors/door-locked.png';
		}

		// Determine door image based on state and safety
		switch (doorInfo.state) {
		case 'opened':
			return '/images/doors/door-opened.png';
		case 'closed':
			// Check if door should be restricted (unsafe conditions)
			if (connectedRoom && (room.status === 'damaged' || connectedRoom.status === 'damaged' ||
				room.status === 'destroyed' || connectedRoom.status === 'destroyed')) {
				return '/images/doors/door-restricted.png';
			}
			return '/images/doors/door-closed.png';
		case 'locked':
			return '/images/doors/door-locked.png';
		default:
			return '/images/doors/door-closed.png';
		}
	};

	// Handle door click for a specific toRoomId
	const handleDoorClickForOpening = (toRoomId: string) => {
		onDoorClick(room.id, toRoomId);
	};

	// Render walls with gaps for door openings
	const renderWalls = () => {
		if (!room.unlocked) return null;

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

					// Add door image in place of wall segment
					const doorImage = getDoorImageForOpening(opening.toRoomId);
					elements.push(
						<image
							key={`door-${index}`}
							href={doorImage}
							x={doorStartX}
							y={wallY}
							width={doorWidth}
							height={wallHeight}
							style={{ cursor: 'pointer' }}
							onClick={() => handleDoorClickForOpening(opening.toRoomId)}
						/>,
					);

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

					// Add door image in place of wall segment
					const doorImage = getDoorImageForOpening(opening.toRoomId);
					elements.push(
						<image
							key={`door-${index}`}
							href={doorImage}
							x={wallX}
							y={doorStartY}
							width={wallWidth}
							height={doorWidth}
							style={{ cursor: 'pointer' }}
							onClick={() => handleDoorClickForOpening(opening.toRoomId)}
							transform={`rotate(90 ${wallX + wallWidth/2} ${doorStartY + doorWidth/2})`}
						/>,
					);

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
				opacity={room.unlocked ? 1 : 0.6}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			/>
		);
	};

	// Render room type icon (only for non-gate rooms and only if unlocked)
	const renderRoomIcon = () => {
		if (room.type === 'gate_room' || !room.unlocked) return null;

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
		const progressRadius = maxDimension + 16; // Use larger dimension for progress ring
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
				{/* Crew indicators */}
				{exploration.crewAssigned.map((crew, index) => {
					const angle = (index * 60) - 90; // 60 degrees apart
					const rad = (angle * Math.PI) / 180;
					const crewX = position.x + Math.cos(rad) * (maxDimension + 25); // Use max dimension
					const crewY = position.y + Math.sin(rad) * (maxDimension + 25);

					return (
						<circle
							key={crew}
							cx={crewX}
							cy={crewY}
							r="5" // Increased from 3 to 5 for larger visibility
							fill="#10b981"
							opacity="0.8"
						/>
					);
				})}
				{/* Progress percentage text */}
				<text
					x={position.x}
					y={position.y - maxDimension - 20} // Use max dimension
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
		if (room.unlocked || exploration) return null;

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
					x={position.x + halfWidth - 12} // Use halfWidth
					y={position.y - halfHeight + 18} // Use halfHeight
					textAnchor="middle"
					fill="#ffffff"
					fontSize="14" // Increased from 10 to 14
					fontWeight="bold"
				>
					🔒
				</text>
			</g>
		);
	};

	// Render hover overlay with room name
	const renderHoverOverlay = () => {
		if (!isHovered) return null;

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
					opacity="0.7"
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
					fontSize="16"
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
			{/* Room background image (if unlocked) - tiled pattern */}
			{room.unlocked && (
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
						ref={imageRef}
						href={getRoomOverlayImage()}
						x={position.x - 32}
						y={position.y - 32}
						width="64"
						height="64"
						opacity="0.9"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
					/>
				</g>
			)}

			{/* Room click area (invisible) */}
			<rect
				x={position.x - halfWidth}
				y={position.y - halfHeight}
				width={roomDimensions.width}
				height={roomDimensions.height}
				fill={room.unlocked ? 'transparent' : getRoomColor()}
				stroke="none"
				style={{
					cursor: canExplore ? 'pointer' : 'default',
					filter: room.unlocked ? 'none' : 'brightness(0.6)',
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

			{/* Fog of war overlay for partially visible rooms */}
			{!room.unlocked && (
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
