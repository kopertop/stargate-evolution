import { useQuery } from '@livestore/react';
import { DoorInfoSchema, type DestinyStatus, type DoorInfo, type RoomTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert } from 'react-bootstrap';
import { GiKey, GiPauseButton } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import { useGameService } from '../services/game-service';
import { getRoomScreenPosition as getGridRoomScreenPosition, calculateRoomPositions } from '../utils/grid-system';

import { CountdownClock } from './countdown-clock';
import { RoomDetailsModal } from './room-details-modal';
import { RoomExploration } from './room-exploration';
import { ShipDoors } from './ship-doors';
import { ShipRoom } from './ship-room';


interface CameraTransform {
	x: number;
	y: number;
	scale: number;
}

interface ShipMapProps {
	game_id: string;
}

export const ShipMap: React.FC<ShipMapProps> = ({ game_id }) => {
	const { isPaused: gameStatePaused, resumeGame } = useGameState();
	const [selectedRoom, setSelectedRoom] = useState<RoomTemplate | null>(null);
	const [showExplorationModal, setShowExplorationModal] = useState(false);
	const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
	const [showDoorModal, setShowDoorModal] = useState(false);
	const [selectedDoor, setSelectedDoor] = useState<{
			fromRoom: RoomTemplate;
			door: DoorInfo;
	} | null>(null);
	const [showDangerWarning, setShowDangerWarning] = useState(false);
	const [dangerousDoor, setDangerousDoor] = useState<{
		fromRoomId: string;
		toRoomId: string;
		reason: string;
	} | null>(null);

	// Camera state for zooming and panning
	const [camera, setCamera] = useState<CameraTransform>({ x: 0, y: 0, scale: 1 });
	const [isDragging, setIsDragging] = useState(false);
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

	const gameService = useGameService();
	const roomsRaw = useQuery(gameService.queries.roomsByGame(game_id)) || [];
	const doors = useQuery(gameService.queries.getDoorsByGame(game_id)) || [];
	// Normalize rooms to mutable, non-nullable fields
	const rooms: RoomTemplate[] = React.useMemo(() => {
		return roomsRaw.map(room => ({
			...room,
			description: room.description ?? '',
			found: !!room.found,
			locked: !!room.locked,
			explored: !!room.explored,
			exploration_data: room.exploration_data ?? undefined,
			status: room.status ?? undefined,
			base_exploration_time: room.base_exploration_time ?? undefined,
			created_at: typeof room.created_at === 'number' ? room.created_at : (room.created_at ? new Date(room.created_at).getTime() : Date.now()),
			updated_at: typeof room.updated_at === 'number' ? room.updated_at : (room.updated_at ? new Date(room.updated_at).getTime() : Date.now()),
		}));
	}, [roomsRaw]);

	const destinyStatusArr = useQuery(game_id ? gameService.queries.destinyStatus(game_id) : gameService.queries.destinyStatus('')) || [];
	const destinyStatus = destinyStatusArr[0] as DestinyStatus;
	const inventoryArr = useQuery(game_id ? gameService.queries.inventoryByGame(game_id) : gameService.queries.inventoryByGame('')) || [];
	const inventoryMap = Object.fromEntries(inventoryArr.map((i) => [i.resource_type, i.amount]));

	// Auto-focus the SVG for keyboard controls
	useEffect(() => {
		const svgElement = document.querySelector('svg[tabindex="0"]') as SVGElement;
		if (svgElement) {
			svgElement.focus();
		}
	}, []);

	// Check if room is visible (only found rooms are visible)
	const isRoomVisible = (room: RoomTemplate): boolean => {
		return !!room.found;
	};

	// Handle room click
	const handleRoomClick = (room: RoomTemplate) => {
		if (!isRoomVisible(room) || gameStatePaused) return;
		if (room.exploration_data) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
			return;
		}
		if (!!room.found && !room.explored && !gameStatePaused) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
		} else if (!!room.found && !!room.explored && !room.locked) {
			setSelectedRoom(room);
			setShowRoomDetailsModal(true);
		}
	};

	// Convert room coordinates to screen position using grid system
	const getRoomScreenPosition = (room: RoomTemplate, positions: any) => {
		return getGridRoomScreenPosition(room, positions);
	};

	// Check if a door is dangerous to open
	const checkDoorDanger = (fromRoomId: string, toRoomId: string): { isDangerous: boolean; reason: string } => {
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		const toRoom = rooms.find(r => r.id === toRoomId);
		if (!fromRoom || !toRoom) {
			return { isDangerous: false, reason: '' };
		}
		if (toRoom.status === 'damaged') {
			return {
				isDangerous: true,
				reason: 'The adjacent room shows signs of structural damage. Opening this door may cause rapid atmospheric decompression.',
			};
		}
		if (toRoom.status === 'destroyed') {
			return {
				isDangerous: true,
				reason: 'The adjacent room has been destroyed and is venting to space. Opening this door will cause catastrophic decompression.',
			};
		}
		if (toRoom.type === 'airlock' && toRoom.status !== 'ok') {
			return {
				isDangerous: true,
				reason: 'The airlock systems are malfunctioning. Opening this door may result in atmospheric loss.',
			};
		}
		return { isDangerous: false, reason: '' };
	};

	// Check if door requirements are met
	const checkDoorRequirements = (door: DoorInfo): { canOpen: boolean; unmetRequirements: DoorInfo['requirements'] } => {
		if (!destinyStatus) {
			return { canOpen: false, unmetRequirements: [] };
		}
		const unmetRequirements: DoorInfo['requirements'] = [];
		if (door.requirements) {
			for (const requirement of door.requirements) {
				let met = requirement.met;
				switch (requirement.type) {
				case 'power_level': {
					const requiredPower = parseInt(requirement.value);
					met = destinyStatus.power >= requiredPower;
					break;
				}
				case 'item':
					met = (inventoryMap[requirement.value] || 0) > 0;
					break;
				case 'technology':
					met = (inventoryMap[requirement.value] || 0) > 0;
					break;
				case 'crew_skill':
					met = true; // Simplified for now
					break;
				case 'story_progress':
					met = false; // Default to false for now
					break;
				case 'code':
					met = false; // Default to false for now
					break;
				}
				if (!met) {
					unmetRequirements.push({ ...requirement, met: met || false });
				}
			}
		}
		return {
			canOpen: unmetRequirements.length === 0,
			unmetRequirements,
		};
	};

	// Handle door click to open/close/unlock doors
	const handleDoorClick = async (fromRoomId: string, toRoomId: string) => {
		if (gameStatePaused) {
			console.log('[DEBUG] Game is paused, skipping door click');
			return;
		}
		const door = doors.find(d =>
			(d.from_room_id === fromRoomId && d.to_room_id === toRoomId) ||
			(d.from_room_id === toRoomId && d.to_room_id === fromRoomId),
		);
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		if (!fromRoom || !door) {
			console.warn('[WARNING] Door or fromRoom not found, skipping door click', { fromRoomId, toRoomId });
			return;
		}
		if (door.state === 'locked') {
			setSelectedDoor({
				fromRoom,
				door: DoorInfoSchema.parse({
					toRoomId: door.to_room_id,
					state: door.state as 'locked' | 'opened' | 'closed',
					requirements: JSON.parse(door.requirements ?? '[]') as DoorInfo['requirements'],
				}),
			});
			setShowDoorModal(true);
			return;
		}
		const newState = door.state === 'opened' ? 'closed' : 'opened';
		if (newState === 'opened') {
			const { isDangerous, reason } = checkDoorDanger(fromRoomId, toRoomId);
			if (isDangerous) {
				setDangerousDoor({ fromRoomId, toRoomId, reason });
				setShowDangerWarning(true);
				return;
			}
		}
		await updateDoorState(fromRoomId, toRoomId, newState);
		if (newState === 'opened') {
			await gameService.updateRoom(fromRoomId, { found: true });
			await gameService.updateRoom(toRoomId, { found: true });
			await handleDoorOpenConsequences(fromRoomId, toRoomId);
		}
	};

	// Update door state in database
	const updateDoorState = async (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		try {
			await gameService.updateDoorState(fromRoomId, toRoomId, newState);
		} catch (error) {
			console.error('[ShipMap] Failed to update door state in database:', error);
		}
	};

	// Handle consequences of opening a door (atmospheric effects, etc.)
	const handleDoorOpenConsequences = async (fromRoomId: string, toRoomId: string) => {
		if (!destinyStatus) return;
		const { isDangerous } = checkDoorDanger(fromRoomId, toRoomId);
		if (isDangerous) {
			const toRoom = rooms.find(r => r.id === toRoomId);
			if (toRoom?.status === 'damaged') {
				const newO2 = Math.max(0, destinyStatus.o2 - 2);
				const newCO2 = Math.min(10, destinyStatus.co2 + 1);
				console.log('⚠️ Atmospheric breach detected! O2 levels dropping due to damaged room connection.', newO2, newCO2);
			} else if (toRoom?.status === 'destroyed') {
				const newO2 = Math.max(0, destinyStatus.o2 - 5);
				const newCO2 = Math.min(10, destinyStatus.co2 + 2);
				console.log('🚨 CRITICAL BREACH! Massive atmospheric loss due to destroyed room exposure!', newO2, newCO2);
			}
		}
	};

	// Monitor open dangerous doors for continuous atmospheric drain
	useEffect(() => {
		if (gameStatePaused) return;
		const interval = setInterval(() => {
			let hasOpenDangerousDoor = false;
			let severityMultiplier = 0;
			for (const door of doors) {
				if (door.state === 'opened') {
					const { isDangerous } = checkDoorDanger(door.from_room_id, door.to_room_id);
					if (isDangerous) {
						hasOpenDangerousDoor = true;
						const toRoom = rooms.find(r => r.id === door.to_room_id);
						if (toRoom?.status === 'destroyed') {
							severityMultiplier += 2;
						} else if (toRoom?.status === 'damaged') {
							severityMultiplier += 1;
						}
					}
				}
			}
			if (hasOpenDangerousDoor && severityMultiplier > 0 && destinyStatus) {
				const drainRate = 0.1 * severityMultiplier;
				const newO2 = Math.max(0, destinyStatus.o2 - drainRate);
				const newCO2 = Math.min(10, destinyStatus.co2 + (drainRate * 0.5));
				if (Date.now() % 10000 < 1000) {
					console.log(`🚨 Atmospheric breach ongoing! O2: ${newO2.toFixed(1)}% | CO2: ${newCO2.toFixed(1)}%`);
				}
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [gameStatePaused, rooms, doors, destinyStatus?.o2, destinyStatus?.co2]);

	// Keyboard controls for camera movement and zoom
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Prevent default behavior for our handled keys
			if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', '+', '-', '='].includes(e.key.toLowerCase())) {
				e.preventDefault();
			}

			const panSpeed = 100 / camera.scale; // Adjust pan speed based on zoom level
			const zoomSpeed = 0.1;

			switch (e.key.toLowerCase()) {
			case 'w':
			case 'arrowup':
				setCamera(prev => ({ ...prev, y: prev.y + panSpeed }));
				break;
			case 's':
			case 'arrowdown':
				setCamera(prev => ({ ...prev, y: prev.y - panSpeed }));
				break;
			case 'a':
			case 'arrowleft':
				setCamera(prev => ({ ...prev, x: prev.x + panSpeed }));
				break;
			case 'd':
			case 'arrowright':
				setCamera(prev => ({ ...prev, x: prev.x - panSpeed }));
				break;
			case '+':
			case '=':
				setCamera(prev => ({
					...prev,
					scale: Math.min(prev.scale + zoomSpeed, 3), // Max zoom 3x
				}));
				break;
			case '-':
				setCamera(prev => ({
					...prev,
					scale: Math.max(prev.scale - zoomSpeed, 0.2), // Min zoom 0.2x
				}));
				break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [camera.scale]);

	// Mouse controls for dragging and wheel zoom
	const handleMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		setLastMousePos({ x: e.clientX, y: e.clientY });
	};

	/** Mouse Drag Controls */
	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;

		const deltaX = (e.clientX - lastMousePos.x);
		const deltaY = (e.clientY - lastMousePos.y);

		setCamera(prev => ({
			...prev,
			// NOTE: DO NOT adjust by scale here, or it will feel very weird
			// Dragging here moves the camera at the same speed regardless of zoom level
			x: prev.x + deltaX,
			y: prev.y + deltaY,
		}));

		setLastMousePos({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleWheel = (e: React.WheelEvent) => {
		// e.preventDefault();
		const zoomSpeed = 0.005;
		const delta = -e.deltaY * zoomSpeed;

		setCamera(prev => ({
			...prev,
			scale: Math.max(0.2, Math.min(3, prev.scale + delta)),
		}));
	};

	// Reset camera to default position and zoom
	const resetCamera = () => {
		setCamera({ x: 0, y: 0, scale: 1 });
	};

	// Handle user overriding the danger warning
	const handleDangerOverride = async () => {
		if (!dangerousDoor) return;

		const { fromRoomId, toRoomId } = dangerousDoor;

		// Close the warning modal
		setShowDangerWarning(false);
		setDangerousDoor(null);

		// Open the door despite the danger
		await updateDoorState(fromRoomId, toRoomId, 'opened');
		await handleDoorOpenConsequences(fromRoomId, toRoomId);
	};

	// Handle user canceling the dangerous door operation
	const handleDangerCancel = () => {
		setShowDangerWarning(false);
		setDangerousDoor(null);
	};

	let requirements: any[] = [];
	if (selectedDoor && selectedDoor.door && selectedDoor.door.requirements) {
		if (typeof selectedDoor.door.requirements === 'string') {
			try {
				requirements = JSON.parse(selectedDoor.door.requirements);
			} catch {
				requirements = [];
			}
		} else if (Array.isArray(selectedDoor.door.requirements)) {
			requirements = selectedDoor.door.requirements;
		}
	}

	// Compute room positions for the grid system
	const roomPosition = React.useMemo(() => {
		if (!rooms || rooms.length === 0) return {};
		const rootRoom = rooms.find(r => r.type === 'gate_room')?.id || rooms[0]?.id;
		return rootRoom ? calculateRoomPositions(rooms, rootRoom) : {};
	}, [rooms]);

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
			{/* Countdown Clock */}
			<CountdownClock />

			{/* Camera Controls UI */}
			<div style={{
				position: 'absolute',
				top: '10px',
				right: '10px',
				background: 'rgba(0, 0, 0, 0.8)',
				color: 'white',
				padding: '10px',
				borderRadius: '5px',
				fontSize: '12px',
				zIndex: 1000,
			}}>
				<div><strong>Camera Controls:</strong></div>
				<div>WASD / Arrow Keys: Pan</div>
				<div>+/- Keys: Zoom</div>
				<div>Mouse: Drag to pan, wheel to zoom</div>
				<div style={{ marginTop: '5px' }}>
					<strong>Zoom: {Math.round(camera.scale * 100)}%</strong>
				</div>
				<Button
					size="sm"
					variant="outline-light"
					onClick={resetCamera}
					style={{ marginTop: '5px', fontSize: '10px' }}
				>
					Reset View
				</Button>
			</div>

			{/* Ship Layout SVG */}
			<svg
				width="100%"
				height="100%"
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					cursor: gameStatePaused ? 'default' : (isDragging ? 'grabbing' : 'grab'),
					pointerEvents: gameStatePaused ? 'none' : 'auto',
				}}
				onMouseDown={gameStatePaused ? undefined : (e) => { setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); }}
				onMouseMove={gameStatePaused ? undefined : (e) => {
					if (!isDragging) return;
					const deltaX = (e.clientX - lastMousePos.x);
					const deltaY = (e.clientY - lastMousePos.y);
					setCamera(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
					setLastMousePos({ x: e.clientX, y: e.clientY });
				}}
				onMouseUp={gameStatePaused ? undefined : () => setIsDragging(false)}
				onMouseLeave={gameStatePaused ? undefined : () => setIsDragging(false)}
				onWheel={gameStatePaused ? undefined : (e) => {
					const zoomSpeed = 0.005;
					const delta = -e.deltaY * zoomSpeed;
					setCamera(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale + delta)) }));
				}}
				tabIndex={gameStatePaused ? -1 : 0}
			>
				{/* Background space pattern */}
				<defs>
					<pattern id="spacePattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
						<circle cx="20" cy="20" r="0.5" fill="#334155" opacity="0.3"/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#spacePattern)"/>

				{/* Camera transform group */}
				<g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
					{/* Render all visible rooms */}
					{rooms.map(room => {
						const position = getRoomScreenPosition(room, roomPosition);
						return (
							<ShipRoom
								key={room.id}
								room={room}
								position={position}
								isVisible={room.found || false}
								canExplore={(
									room.found
									&& !room.explored
									&& !room.exploration_data
									&& !gameStatePaused
								) || false}
								onRoomClick={handleRoomClick}
								allRooms={rooms}
							/>
						);
					})}
					{/* Render all doors */}
					<ShipDoors
						rooms={rooms}
						onDoorClick={handleDoorClick}
						roomPosition={roomPosition}
					/>
				</g>
			</svg>

			{/* Pause Overlay */}
			{gameStatePaused && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						backgroundColor: 'rgba(0, 0, 0, 0.7)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
						zIndex: 1000,
					}}
					onClick={() => {
						// Resume game by calling resumeGame from context
						resumeGame();
					}}
				>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							color: 'white',
							fontSize: '24px',
							fontWeight: 'bold',
							textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
						}}
					>
						{/* Pause Symbol */}
						<div
							style={{
								fontSize: '120px',
								marginBottom: '20px',
								opacity: 0.5,
							}}
						>
							<GiPauseButton size={120} />
						</div>
						<div style={{ fontSize: '32px', marginBottom: '10px' }}>
							GAME PAUSED
						</div>
						<div style={{ fontSize: '18px', opacity: 0.8 }}>
							Click to Resume
						</div>
					</div>
				</div>
			)}

			{/* Room Exploration Component */}
			{selectedRoom && (
				<RoomExploration
					game_id={game_id}
					roomId={selectedRoom.id}
					showModal={showExplorationModal}
					onClose={() => {
						setShowExplorationModal(false);
						setSelectedRoom(null);
					}}
					onExplorationStart={(roomId: string, crewIds: string[]) => {
						console.log(`🔍 Started exploration of room ${roomId} with ${crewIds.length} crew members`);
					}}
				/>
			)}

			{/* Room Details Modal */}
			<RoomDetailsModal
				show={showRoomDetailsModal}
				onHide={() => {
					setShowRoomDetailsModal(false);
					setSelectedRoom(null);
				}}
				room={selectedRoom}
				game_id={game_id}
			/>

			{/* Door Requirements Modal */}
			<Modal show={showDoorModal} onHide={() => setShowDoorModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>
						<GiKey className="me-2" />
						Door Locked
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedDoor && (
						<div>
							<p><strong>Door:</strong> {selectedDoor.fromRoom.name}</p>
							<Alert variant="warning">
								This door is locked. You must meet the following requirements to unlock it:
							</Alert>
							{requirements.length > 0 ? requirements.map((req, index) => {
								const door = selectedDoor.door;
								const state = (door as any).state || (door as any).initial_state || 'locked';
								const isReqMet = checkDoorRequirements({
									toRoomId: (door as any).to_room_id,
									state: (door as any).state,
									requirements: [req],
								}).canOpen;
								return (
									<div key={index} className={`alert ${isReqMet ? 'alert-success' : 'alert-danger'} mb-2`}>
										<strong>{req.type.replace('_', ' ').toUpperCase()}:</strong> {req.description}
										{req.type === 'power_level' && destinyStatus && (
											<div className="mt-1">
												<small>Required: {req.value} | Current: {destinyStatus.power}</small>
											</div>
										)}
										{(req.type === 'item' || req.type === 'technology') && (
											<div className="mt-1">
												<small>
													In inventory: {inventoryMap[req.value] || 0}
												</small>
											</div>
										)}
									</div>
								);
							}) : <div>No requirements found</div>}
							{/* Unlock/Open button if all requirements are met */}
							{requirements.length > 0 && requirements.every((req: any) => checkDoorRequirements({
								toRoomId: (selectedDoor.door as any).to_room_id,
								state: (selectedDoor.door as any).state,
								requirements: [req],
							}).canOpen) && (
								<Button
									variant="success"
									onClick={async () => {
										await gameService.updateDoorState(selectedDoor.fromRoom.id, (selectedDoor.door as any).to_room_id, 'opened');
										await gameService.updateRoom((selectedDoor.door as any).to_room_id, { found: true });
										setShowDoorModal(false);
									}}
								>
									Unlock & Open Door
								</Button>
							)}
						</div>
					)}
				</Modal.Body>
			</Modal>

			{/* Dangerous Door Modal */}
			<Modal show={showDangerWarning} onHide={handleDangerCancel}>
				<Modal.Header closeButton>
					<Modal.Title>⚠️ Danger: Atmospheric Hazard</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{dangerousDoor && (
						<>
							<p><strong>Warning:</strong> {dangerousDoor.reason}</p>
							<Alert variant="danger">
								Opening this door may result in catastrophic consequences (e.g., depressurization, loss of atmosphere, or crew harm). Proceed with extreme caution!
							</Alert>
						</>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={handleDangerCancel}>Cancel</Button>
					<Button variant="danger" onClick={handleDangerOverride}>Override & Open Anyway</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};
