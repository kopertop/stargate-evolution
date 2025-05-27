import { Q } from '@nozbe/watermelondb';
import database, { DestinyStatus, Game, gameService, Room } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert } from 'react-bootstrap';
import { GiKey, GiPauseButton } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import type { DoorInfo, DoorRequirement } from '../types';
import { destinyStatusModelToType, DestinyStatusType, roomModelToType, RoomType } from '../types/model-types';
import { getRoomScreenPosition as getGridRoomScreenPosition } from '../utils/grid-system';

import { CountdownClock } from './countdown-clock';
import { RoomExploration } from './room-exploration';
import { ShipDoors } from './ship-doors';
import { ShipRoom } from './ship-room';

interface CameraTransform {
	x: number;
	y: number;
	scale: number;
}

interface ShipMapProps {
	gameId: string;
}

export const ShipMap: React.FC<ShipMapProps> = ({ gameId }) => {
	const { isPaused: gameStatePaused, resumeGame } = useGameState();
	const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
	const [showExplorationModal, setShowExplorationModal] = useState(false);
	const [showDoorModal, setShowDoorModal] = useState(false);
	const [selectedDoor, setSelectedDoor] = useState<{ fromRoom: RoomType; door: DoorInfo } | null>(null);
	const [showDangerWarning, setShowDangerWarning] = useState(false);
	const [dangerousDoor, setDangerousDoor] = useState<{ fromRoomId: string; toRoomId: string; reason: string } | null>(null);

	// Camera state for zooming and panning
	const [camera, setCamera] = useState<CameraTransform>({ x: 0, y: 0, scale: 1 });
	const [isDragging, setIsDragging] = useState(false);
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

	// Observed data
	const [game, setGame] = useState<Game| null>(null);
	const [rooms, setRooms] = useState<RoomType[]>([]);
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatusType | null>(null);

	/**
	 * Observables
	 */
	useEffect(() => {
		if (gameId) {
			const gameSubscription = database
				.get<Game>('games')
				.findAndObserve(gameId).subscribe((g) => {
					setGame(g);
				});
			const roomsSubscription = database
				.get<Room>('rooms')
				.query(Q.where('game_id', gameId))
				.observe().subscribe((r) => {
					setRooms(r.map(roomModelToType));
				});
			const destinyStatusSubscription = database
				.get<DestinyStatus>('destiny_status')
				.findAndObserve(gameId)
				.subscribe((d) => {
					setDestinyStatus(destinyStatusModelToType(d));
				});
			return () => {
				gameSubscription.unsubscribe();
				roomsSubscription.unsubscribe();
				destinyStatusSubscription.unsubscribe();
			};
		}
	}, [gameId]);

	// Auto-focus the SVG for keyboard controls
	useEffect(() => {
		const svgElement = document.querySelector('svg[tabindex="0"]') as SVGElement;
		if (svgElement) {
			svgElement.focus();
		}
	}, []);

	// Check if room is visible (only found rooms are visible)
	const isRoomVisible = (room: RoomType): boolean => {
		// Only show rooms that have been found
		return room.found;
	};

	// Handle room click
	const handleRoomClick = (room: RoomType) => {
		if (!isRoomVisible(room) || gameStatePaused) return;

		// Check if room is currently being explored
		if (room.explorationData) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
			return;
		}

		// Check if room can be explored (found but not explored)
		if (room.found && !room.explored && !gameStatePaused) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
		} else if (!room.locked) {
			// Show room details or allow crew assignment
			console.log(`Accessing ${room.type}`);
		}
	};

	// Convert room coordinates to screen position using grid system
	const getRoomScreenPosition = (room: RoomType) => {
		return getGridRoomScreenPosition(room);
	};

	// Check if a door is dangerous to open
	const checkDoorDanger = (fromRoomId: string, toRoomId: string): { isDangerous: boolean; reason: string } => {
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		const toRoom = rooms.find(r => r.id === toRoomId);

		if (!fromRoom || !toRoom) {
			return { isDangerous: false, reason: '' };
		}

		// Check for atmospheric hazards
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

		// Check for other hazards (can be expanded)
		if (toRoom.type === 'airlock' && toRoom.status !== 'ok') {
			return {
				isDangerous: true,
				reason: 'The airlock systems are malfunctioning. Opening this door may result in atmospheric loss.',
			};
		}

		return { isDangerous: false, reason: '' };
	};

	// Check if door requirements are met
	const checkDoorRequirements = (door: DoorInfo): { canOpen: boolean; unmetRequirements: DoorRequirement[] } => {
		if (!destinyStatus) {
			return { canOpen: false, unmetRequirements: [] };
		}

		const unmetRequirements: DoorRequirement[] = [];

		for (const requirement of door.requirements) {
			let met = requirement.met;

			// Check requirement based on type
			switch (requirement.type) {
			case 'power_level': {
				const requiredPower = parseInt(requirement.value);
				met = destinyStatus.power >= requiredPower;
				break;
			}
			case 'item':
				// met = destinyStatus.inventory && destinyStatus.inventory[requirement.value] > 0;
				met = false;
				break;
			case 'technology':
				// met = destinyStatus.inventory && destinyStatus.inventory[requirement.value] > 0;
				met = false;
				break;
			case 'crew_skill':
				// For now, assume we have qualified crew
				met = true; // Simplified for now
				break;
			case 'story_progress':
				// This would be checked against game progress flags
				met = false; // Default to false for now
				break;
			case 'code':
				// Codes need to be discovered through gameplay
				met = false; // Default to false for now
				break;
			}

			if (!met) {
				unmetRequirements.push({ ...requirement, met });
			}
		}

		return {
			canOpen: unmetRequirements.length === 0,
			unmetRequirements,
		};
	};

	// Handle door click to open/close/unlock doors
	const handleDoorClick = async (fromRoomId: string, toRoomId: string) => {
		if (gameStatePaused) return; // Prevent door interaction when paused

		const fromRoom = rooms.find(r => r.id === fromRoomId);
		if (!fromRoom) return;

		const door = fromRoom.doors.find(d => d.toRoomId === toRoomId);
		if (!door) return;

		if (door.state === 'locked') {
			// Check if requirements are met
			const { canOpen } = checkDoorRequirements(door);

			if (canOpen) {
				// Requirements met, unlock the door
				await updateDoorState(fromRoomId, toRoomId, 'opened');
				// Mark the connected room as found when door is unlocked and opened
				await markRoomAsFound(toRoomId);
			} else {
				// Show requirements modal
				setSelectedDoor({ fromRoom, door });
				setShowDoorModal(true);
			}
		} else {
			// Toggle between closed and opened
			const newState = door.state === 'opened' ? 'closed' : 'opened';

			// If opening a door, check for dangers first
			if (newState === 'opened') {
				const { isDangerous, reason } = checkDoorDanger(fromRoomId, toRoomId);

				if (isDangerous) {
					// Show warning modal instead of opening immediately
					setDangerousDoor({ fromRoomId, toRoomId, reason });
					setShowDangerWarning(true);
					return;
				}
			}

			await updateDoorState(fromRoomId, toRoomId, newState);

			// If opening a door, mark the connected room as found and handle consequences
			if (newState === 'opened') {
				await markRoomAsFound(toRoomId);
				await handleDoorOpenConsequences(fromRoomId, toRoomId);
			}
		}
	};

	// Mark a room as found (discovered)
	const markRoomAsFound = async (roomId: string) => {
		console.log('markRoomAsFound', roomId);
		// Update database - set found
		if (game?.id) {
			try {
				await gameService.updateRoom(roomId, { found: true });
			} catch (error) {
				console.error('Failed to update room found status in database:', error);
			}
		}
	};

	// Handle consequences of opening a door (atmospheric effects, etc.)
	const handleDoorOpenConsequences = async (fromRoomId: string, toRoomId: string) => {
		if (!destinyStatus) return;

		const { isDangerous } = checkDoorDanger(fromRoomId, toRoomId);

		if (isDangerous) {
			const toRoom = rooms.find(r => r.id === toRoomId);

			if (toRoom?.status === 'damaged') {
				// Moderate atmospheric loss
				const newAtmosphere = {
					...destinyStatus.atmosphere,
				} as DestinyStatusType['atmosphere'];
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 2); // Lose 2% O2
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 1); // Gain 1% CO2

				/*
				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});
				*/

				console.log('⚠️ Atmospheric breach detected! O2 levels dropping due to damaged room connection.');
			} else if (toRoom?.status === 'destroyed') {
				// Severe atmospheric loss
				const newAtmosphere = {
					...destinyStatus.atmosphere,
				} as DestinyStatusType['atmosphere'];
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 5); // Lose 5% O2
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 2); // Gain 2% CO2

				/*
				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});
				*/

				console.log('🚨 CRITICAL BREACH! Massive atmospheric loss due to destroyed room exposure!');
			}
		}
	};

	// Update door state in database and local state
	const updateDoorState = async (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		// Update database first
		if (game?.id) {
			try {
				await gameService.updateDoorState(fromRoomId, toRoomId, newState);
				console.log(`Door ${fromRoomId} -> ${toRoomId} set to ${newState}`);
			} catch (error) {
				console.error('Failed to update door state in database:', error);
				return; // Don't update local state if database update fails
			}
		}

		// Update local state (bidirectional)
		/*
		setRooms(prev => prev.map(room => {
			// Update door in fromRoom
			if (room.id === fromRoomId) {
				const updatedDoors = room.doors.map(door =>
					door.toRoomId === toRoomId
						? { ...door, state: newState }
						: door,
				);
				return { ...room, doors: updatedDoors };
			}
			// Update corresponding door in toRoom
			if (room.id === toRoomId) {
				const updatedDoors = room.doors.map(door =>
					door.toRoomId === fromRoomId
						? { ...door, state: newState }
						: door,
				);
				return { ...room, doors: updatedDoors };
			}
			return room;
		}));
		*/
	};



	// Monitor open dangerous doors for continuous atmospheric drain
	useEffect(() => {
		if (gameStatePaused) return;

		const interval = setInterval(() => {
			// Check for open doors to dangerous rooms
			let hasOpenDangerousDoor = false;
			let severityMultiplier = 0;

			for (const room of rooms) {
				for (const door of room.doors) {
					if (door.state === 'opened') {
						const { isDangerous } = checkDoorDanger(room.id, door.toRoomId);
						if (isDangerous) {
							hasOpenDangerousDoor = true;
							const toRoom = rooms.find(r => r.id === door.toRoomId);

							// Increase severity based on room status
							if (toRoom?.status === 'destroyed') {
								severityMultiplier += 2; // Severe drain
							} else if (toRoom?.status === 'damaged') {
								severityMultiplier += 1; // Moderate drain
							}
						}
					}
				}
			}

			// Apply continuous atmospheric drain if dangerous doors are open
			if (hasOpenDangerousDoor && severityMultiplier > 0 && destinyStatus) {
				const drainRate = 0.1 * severityMultiplier; // Base drain per second

				const newAtmosphere = {
					...destinyStatus.atmosphere,
				};
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - drainRate);
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + (drainRate * 0.5));

				/*
				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});
				*/

				// Log warning every 10 seconds
				if (Date.now() % 10000 < 1000) {
					console.log(`🚨 Atmospheric breach ongoing! O2: ${newAtmosphere.o2.toFixed(1)}% | CO2: ${newAtmosphere.co2.toFixed(1)}%`);
				}
			}
		}, 1000); // Check every second

		return () => clearInterval(interval);
	}, [
		gameStatePaused,
		rooms,
		destinyStatus?.atmosphere,
	]);

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
		await markRoomAsFound(toRoomId);
		await handleDoorOpenConsequences(fromRoomId, toRoomId);
	};

	// Handle user canceling the dangerous door operation
	const handleDangerCancel = () => {
		setShowDangerWarning(false);
		setDangerousDoor(null);
	};

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
				onMouseDown={gameStatePaused ? undefined : handleMouseDown}
				onMouseMove={gameStatePaused ? undefined : handleMouseMove}
				onMouseUp={gameStatePaused ? undefined : handleMouseUp}
				onMouseLeave={gameStatePaused ? undefined : handleMouseUp}
				onWheel={gameStatePaused ? undefined : handleWheel}
				tabIndex={gameStatePaused ? -1 : 0} // Make SVG focusable for keyboard events only when not paused
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
					{rooms
						.filter(room => isRoomVisible(room))
						.map(room => {
							// console.log('🏠 Rendering room:', room.type, 'at position:', getRoomScreenPosition(room));
							return (
								<ShipRoom
									key={room.id}
									room={room}
									position={getRoomScreenPosition(room)}
									isVisible={isRoomVisible(room)}
									canExplore={room.found && !room.explored && !room.explorationData && !gameStatePaused}
									onRoomClick={handleRoomClick}
									allRooms={rooms}
								/>
							);
						})
					}

					{/* Centralized door rendering - prevents duplicates */}
					<ShipDoors
						rooms={rooms}
						onDoorClick={handleDoorClick}
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
					gameId={gameId}
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
							<p><strong>Door:</strong> {selectedDoor.door.description || `${selectedDoor.fromRoom.type} to ${selectedDoor.door.toRoomId}`}</p>

							<Alert variant="warning">
								This door is locked and requires the following to unlock:
							</Alert>

							{selectedDoor.door.requirements.map((req, index) => {
								const { canOpen } = checkDoorRequirements(selectedDoor.door);
								const isReqMet = checkDoorRequirements({ ...selectedDoor.door, requirements: [req] }).canOpen;

								return (
									<div key={index} className={`alert ${isReqMet ? 'alert-success' : 'alert-danger'} mb-2`}>
										<strong>{req.type.replace('_', ' ').toUpperCase()}:</strong> {req.description}
										{req.type === 'power_level' && destinyStatus && (
											<div className="mt-1">
												<small>Required: {req.value} | Current: {destinyStatus.power}</small>
											</div>
										)}
										{(req.type === 'item' || req.type === 'technology') && destinyStatus && (
											<div className="mt-1">
												<small>
													In inventory: {destinyStatus.inventory?.[req.value] || 0}
												</small>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowDoorModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Danger Warning Modal */}
			<Modal show={showDangerWarning} onHide={handleDangerCancel} centered>
				<Modal.Header closeButton className="bg-danger text-white">
					<Modal.Title>
						⚠️ DANGER WARNING
					</Modal.Title>
				</Modal.Header>
				<Modal.Body className="bg-dark text-white">
					{dangerousDoor && (
						<div>
							<Alert variant="danger" className="mb-3">
								<strong>DESTINY COMPUTER ADVISORY:</strong><br />
								This door is sealed for safety reasons.
							</Alert>

							<p className="mb-3">
								<strong>Detected Hazard:</strong><br />
								{dangerousDoor.reason}
							</p>

							<Alert variant="warning" className="mb-3">
								<strong>WARNING:</strong> Opening this door may result in:
								<ul className="mt-2 mb-0">
									<li>Rapid atmospheric decompression</li>
									<li>Loss of oxygen and life support</li>
									<li>Potential crew casualties</li>
									<li>Ship-wide system failures</li>
								</ul>
							</Alert>

							<p className="text-center mb-0">
								<strong>Do you wish to override the safety protocols?</strong>
							</p>
						</div>
					)}
				</Modal.Body>
				<Modal.Footer className="bg-dark">
					<Button variant="secondary" onClick={handleDangerCancel}>
						Cancel - Keep Door Sealed
					</Button>
					<Button variant="danger" onClick={handleDangerOverride}>
						⚠️ Override Safety Protocols
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};
