import { useQuery } from '@livestore/react';
import { DoorRequirement, RoomTemplate } from '@stargate/common';
import { title as titleCase } from 'case';
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';

import { useGameState } from '../contexts/game-state-context';
import { events } from '../livestore/schema';
import { apiService } from '../services/api-service';
import { useGameService } from '../services/game-service';
import { getConnectionSide, GRID_UNIT, WALL_THICKNESS, DOOR_SIZE } from '../utils/grid-system';

import { ShipDoor } from './ship-door';

interface ShipRoomProps {
	room: RoomTemplate;
	position: { x: number; y: number };
	isVisible: boolean;
	canExplore?: boolean;
	onRoomClick: (room: RoomTemplate) => void;
	allRooms: RoomTemplate[];
}

const CONNECTION_FIELDS = [
	{ dir: 'north', key: 'connection_north' },
	{ dir: 'south', key: 'connection_south' },
	{ dir: 'east', key: 'connection_east' },
	{ dir: 'west', key: 'connection_west' },
] as const;


export const ShipRoom: React.FC<ShipRoomProps> = ({
	room,
	position,
	isVisible,
	canExplore,
	onRoomClick,
	allRooms,
}) => {
	// State for hover - must be declared before any conditional returns
	const { game } = useGameState();
	const [isHovered, setIsHovered] = useState(false);
	const gameService = useGameService();
	const [debugMenu, setDebugMenu] = useState(false);
	const doors = useQuery(gameService.queries.getDoorsForRoom(room.id));

	useEffect(() => {
		if (!room.found) return;
		for (const { key } of CONNECTION_FIELDS) {
			const toRoomId = room[key];
			if (!toRoomId || typeof toRoomId !== 'string') continue;
			// Check if a door already exists in either direction
			const exists = doors.some((d: any) =>
				(d.from_room_id === room.id && d.to_room_id === toRoomId) ||
				(d.from_room_id === toRoomId && d.to_room_id === room.id),
			);
			if (exists) continue;
			// Create the door if missing
			const doorId = [room.id, toRoomId].sort().join('-');
			const toRoom = allRooms.find(r => r.id === toRoomId);
			const state = (room.locked || toRoom?.locked) ? 'locked' : 'closed';
			const gameId = game?.id || '';
			if (!gameId) {
				console.error('No game ID found');
				throw new Error('No game ID found');
			}
			const requirements: DoorRequirement[] = [];
			if (room.locked || toRoom?.locked) {
				// Lock the room to the bridge
				if (room.template_id === 'bridge' || toRoom?.template_id === 'bridge') {
					requirements.push({
						type: 'code',
						value: 1,
						description: 'You must have an ancient code to unlock this door.',
						met: false,
					});
				}
			}
			console.log('creating door', {
				doorId,
				gameId,
				fromRoomId: room.id,
				toRoomId,
				state,
				requirements,
			});
			gameService.store.commit(events.doorCreated({
				id: doorId,
				game_id: gameId,
				from_room_id: room.id,
				to_room_id: toRoomId,
				state,
				requirements,
			}));
		}
	}, [
		room,
		allRooms,
		gameService,
		doors,
		game?.id,
	]);

	// Don't render if not visible (fog of war)
	if (!isVisible) return null;

	// Calculate room dimensions using grid system
	const getRoomDimensions = () => {
		return {
			width: room.width * GRID_UNIT,
			height: room.height * GRID_UNIT,
		};
	};

	const roomDimensions = getRoomDimensions();
	const halfWidth = roomDimensions.width / 2;
	const halfHeight = roomDimensions.height / 2;

	// Get room color - simplified to just show basic room background
	const getRoomColor = (): string => {
		if (room.exploration_data) return '#2d1b1b'; // Dark during exploration
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
			if (room.type === 'gate_room') {
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
			toRoomId: string;
		}> = [];
		for (const door of doors) {
			const connectedRoomId = door.from_room_id === room.id ? door.to_room_id : door.from_room_id;
			const connectedRoom = allRooms.find(r => r.id === connectedRoomId);
			if (!connectedRoom) continue;
			const side = getConnectionSide(room, connectedRoom);
			if (side) {
				openings.push({ side, position: 0.5, toRoomId: connectedRoomId });
			}
		}
		return openings;
	};

	// Helper function to check if there's an opening on a specific side
	const hasOpeningOnSide = (side: 'top' | 'bottom' | 'left' | 'right'): boolean => {
		const openings = getDoorOpenings();
		return openings?.some(opening => opening.side === side) ?? false;
	};

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
				{!hasOpeningOnSide('top') && !hasOpeningOnSide('left') && renderCorner(position.x - halfWidth, position.y - halfHeight)}
				{!hasOpeningOnSide('top') && !hasOpeningOnSide('right') && renderCorner(position.x + halfWidth - wallThickness, position.y - halfHeight)}
				{!hasOpeningOnSide('bottom') && !hasOpeningOnSide('left') && renderCorner(position.x - halfWidth, position.y + halfHeight - wallThickness)}
				{!hasOpeningOnSide('bottom') && !hasOpeningOnSide('right') && renderCorner(position.x + halfWidth - wallThickness, position.y + halfHeight - wallThickness)}

				{/* Top wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y - halfHeight,
					roomDimensions.width,
					wallThickness,
					openings?.filter(o => o.side === 'top') ?? [],
					'horizontal',
					doorWidth,
				)}

				{/* Bottom wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y + halfHeight - wallThickness,
					roomDimensions.width,
					wallThickness,
					openings?.filter(o => o.side === 'bottom') ?? [],
					'horizontal',
					doorWidth,
				)}

				{/* Left wall */}
				{renderWallSegment(
					position.x - halfWidth,
					position.y - halfHeight,
					wallThickness,
					roomDimensions.height,
					openings?.filter(o => o.side === 'left') ?? [],
					'vertical',
					doorWidth,
				)}

				{/* Right wall */}
				{renderWallSegment(
					position.x + halfWidth - wallThickness,
					position.y - halfHeight,
					wallThickness,
					roomDimensions.height,
					openings?.filter(o => o.side === 'right') ?? [],
					'vertical',
					doorWidth,
				)}
			</g>
		);
	};

	// Render corner wall pieces
	const renderCorner = (x: number, y: number) => {
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

					// Add door gap (no wall segment) - render ShipDoor here
					const door = doors.find(d =>
						(d.from_room_id === room.id && d.to_room_id === opening.toRoomId) ||
						(d.from_room_id === opening.toRoomId && d.to_room_id === room.id),
					);
					const connectedRoom = allRooms.find(r => r.id === opening.toRoomId);
					if (door && connectedRoom) {
						const doorInfo = {
							id: door.id,
							toRoomId: door.to_room_id,
							state: door.state as 'locked' | 'opened' | 'closed',
							requirements: door.requirements ? JSON.parse(door.requirements) : [],
						};
						const doorProps = {
							fromRoom: room,
							toRoom: connectedRoom,
							doorInfo,
							roomPosition: {
								[room.id]: { gridX: position.x, gridY: position.y },
								[connectedRoom.id]: { gridX: position.x, gridY: position.y },
							},
						};
						const doorX = doorStartX;
						const doorY = wallY;
						elements.push(
							<g key={`door-${door.id}`} transform={`translate(${doorX}, ${doorY})`}>
								<ShipDoor {...doorProps} rotation={0} />
							</g>,
						);
					}

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

					// Add door gap (no wall segment) - render ShipDoor here
					const door = doors.find(d =>
						(d.from_room_id === room.id && d.to_room_id === opening.toRoomId) ||
						(d.from_room_id === opening.toRoomId && d.to_room_id === room.id),
					);
					const connectedRoom = allRooms.find(r => r.id === opening.toRoomId);
					if (door && connectedRoom) {
						const doorInfo = {
							id: door.id,
							toRoomId: door.to_room_id,
							state: door.state as 'locked' | 'opened' | 'closed',
							requirements: door.requirements ? JSON.parse(door.requirements) : [],
						};
						const doorProps = {
							fromRoom: room,
							toRoom: connectedRoom,
							doorInfo,
							roomPosition: {
								[room.id]: { gridX: position.x, gridY: position.y },
								[connectedRoom.id]: { gridX: position.x, gridY: position.y },
							},
						};
						const doorX = wallX;
						const doorY = doorStartY;
						elements.push(
							<g key={`door-${door.id}`} transform={`translate(${doorX}, ${doorY})`}>
								<ShipDoor {...doorProps} rotation={90} />
							</g>,
						);
					}

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
		if (!room.type.includes('gate_room')) return null;

		const isActive = room.status === 'ok';
		const stargateImage = isActive ? '/images/stargate-active.png' : '/images/stargate.png';

		return (
			<image
				href={stargateImage}
				x={position.x - 60}  // Increased from 30 to 60 for larger size
				y={position.y - 60}  // Increased from 30 to 60 for larger size
				width="120"          // Increased from 60 to 120 for larger size
				height="120"         // Increased from 60 to 120 for larger size
				opacity={room.found ? 1 : 0.6}
				style={{ pointerEvents: 'none' }} // Prevent interference with room clicks
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
		if (!room.exploration_data) return null;

		const maxDimension = Math.max(halfWidth, halfHeight);
		// Size of the progress ring is half the size of the room
		const progressRadius = maxDimension / 2;
		const circumference = 2 * Math.PI * progressRadius;
		const explorationData = typeof room.exploration_data === 'string' ? JSON.parse(room.exploration_data) : room.exploration_data;
		const strokeDasharray = `${(explorationData.progress / 100) * circumference} ${circumference}`;

		return (
			<g>
				<circle
					cx={position.x}
					cy={position.y}
					r={progressRadius}
					fill="none"
					stroke="#00bfff"
					strokeWidth={8}
					strokeDasharray={strokeDasharray}
					style={{ opacity: 0.7 }}
				/>
				<text
					x={position.x}
					y={position.y}
					textAnchor="middle"
					dominantBaseline="middle"
					fontSize={24}
					fill="#fff"
					style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
				>
					{Math.round(explorationData.progress)}%
				</text>
			</g>
		);
	};

	// Render locked indicator
	const renderLockedIndicator = () => {
		if (!room.found || !room.locked || room.exploration_data) return null;

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

		const roomName = room.name || titleCase(room.type);

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

	// Room click handler with shift+click debug
	const handleRoomClick = (event: React.MouseEvent) => {
		if (event.shiftKey) {
			setDebugMenu(true);
		} else {
			onRoomClick(room);
		}
	};

	return (
		<>
			<g>
				{/* Room background image (if found) - tiled pattern */}
				{room.found && (
					<g>
						<defs>
							<pattern
								id={`floor-pattern-${room.id}`}
								patternUnits="userSpaceOnUse"
								width="32"
								height="32"
							>
								<image
									href={getFloorTileImage()}
									x="0"
									y="0"
									width="32"
									height="32"
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
							style={{ pointerEvents: 'none' }} // Prevent interference with room clicks
						/>
						{/* Room overlay image (if available) */}
						<image
							href={getRoomOverlayImage()}
							x={position.x - 24}
							y={position.y - 24}
							width="48"
							height="48"
							opacity="0.9"
							style={{ pointerEvents: 'none' }} // Prevent interference with room clicks
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
					onClick={handleRoomClick}
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
			{/* Debug Modal for Room */}
			{debugMenu && (
				<Modal show={!!debugMenu} onHide={() => setDebugMenu(false)}>
					<Modal.Header closeButton>
						<Modal.Title>Room Debug Menu</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<div><strong>ID:</strong> {room.id}</div>
						<div><strong>Name:</strong> {room.name}</div>
						<div><strong>Type:</strong> {room.type}</div>
						<div><strong>Found:</strong> {String(room.found)}</div>
						<div><strong>Locked:</strong> {String(room.locked)}</div>
						<div><strong>Explored:</strong> {String(room.explored)}</div>
						<div className="mt-2"><strong>Connections:</strong>
							<ul style={{ marginBottom: 0 }}>
								{['connection_north','connection_south','connection_east','connection_west'].map(key => {
									const connectedRoom = allRooms.find(r => r.id === (room as any)[key]);
									return (room as any)[key]
										? <li key={key}>
											{key.replace('connection_', '')}: {connectedRoom ? connectedRoom.name : (room as any)[key]} ({connectedRoom ? connectedRoom.id : ''})
										</li>
										: null;
								})}
							</ul>
						</div>
						<div className="mt-2"><strong>Doors:</strong>
							<table className="table table-sm table-bordered" style={{ background: '#222', color: '#fff' }}>
								<thead>
									<tr>
										<th>To Room</th>
										<th>To Room ID</th>
										<th>Side</th>
										<th>State</th>
									</tr>
								</thead>
								<tbody>
									{(() => {
										return doors?.map((door) => {
											const connectedRoom = allRooms.find(r => r.id === door.to_room_id);
											const side = connectedRoom ? getConnectionSide(room, connectedRoom) : '?';
											return (
												<tr key={door.id}>
													<td>{connectedRoom ? connectedRoom.name : 'Unknown'}</td>
													<td>{door.to_room_id}</td>
													<td>{side}</td>
													<td>{door.state}</td>
												</tr>
											);
										});
									})()}
								</tbody>
							</table>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => setDebugMenu(false)}>Close</Button>
					</Modal.Footer>
				</Modal>
			)}
		</>
	);
};
