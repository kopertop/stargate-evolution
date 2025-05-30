import { useQuery } from '@livestore/react';
import { DoorRequirement } from '@stargate/common/models/door-template';
import { DestinyStatus, DoorTemplate, RoomTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert } from 'react-bootstrap';
import { GiKey, GiPauseButton } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import { useGameService } from '../services/use-game-service';
import { getRoomScreenPosition as getGridRoomScreenPosition } from '../utils/grid-system';

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
	const [selectedDoor, setSelectedDoor] = useState<{ fromRoom: RoomTemplate; door: DoorTemplate } | null>(null);
	const [showDangerWarning, setShowDangerWarning] = useState(false);
	const [dangerousDoor, setDangerousDoor] = useState<{ fromRoomId: string; toRoomId: string; reason: string } | null>(null);

	// Camera state for zooming and panning
	const [camera, setCamera] = useState<CameraTransform>({ x: 0, y: 0, scale: 1 });
	const [isDragging, setIsDragging] = useState(false);
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

	const gameService = useGameService();
	const rooms = useQuery(game_id ? gameService.queries.roomsByGame(game_id) : gameService.queries.roomsByGame('')) || [];
	const destinyStatusArr = useQuery(game_id ? gameService.queries.destinyStatus(game_id) : gameService.queries.destinyStatus('')) || [];
	const destinyStatus = destinyStatusArr[0] as DestinyStatus;
	const inventoryArr = useQuery(game_id ? gameService.queries.inventoryByGame(game_id) : gameService.queries.inventoryByGame('')) || [];
	const inventoryMap = Object.fromEntries(inventoryArr.map((i: any) => [i.resourceType, i.amount]));

	// Auto-focus the SVG for keyboard controls
	useEffect(() => {
		const svgElement = document.querySelector('svg[tabindex="0"]') as SVGElement;
		if (svgElement) {
			svgElement.focus();
		}
	}, []);

	// Check if room is visible (only found rooms are visible)
	const isRoomVisible = (room: RoomTemplate): boolean => {
		return room.found;
	};

	// Handle room click
	const handleRoomClick = (room: RoomTemplate) => {
		if (!isRoomVisible(room) || gameStatePaused) return;
		if (room.exploration_data) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
			return;
		}
		if (room.found && !room.explored && !gameStatePaused) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
		} else if (room.found && room.explored && !room.locked) {
			setSelectedRoom(room);
			setShowRoomDetailsModal(true);
		}
	};

	// Convert room coordinates to screen position using grid system
	const getRoomScreenPosition = (room: RoomTemplate) => {
		return getGridRoomScreenPosition(room);
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
	const checkDoorRequirements = (door: DoorTemplate): { canOpen: boolean; unmetRequirements: DoorRequirement[] } => {
		if (!destinyStatus) {
			return { canOpen: false, unmetRequirements: [] };
		}
		const unmetRequirements: DoorRequirement[] = [];
		if (door.requirements) {
			const requirements = JSON.parse(door.requirements) as DoorRequirement[];
			for (const requirement of requirements) {
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
					unmetRequirements.push({ ...requirement, met });
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
		if (gameStatePaused) return;
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		if (!fromRoom) return;
		const door = fromRoom.doors?.find(d => d.toRoomId === toRoomId);
		if (!door) return;
		if (door.state === 'locked') {
			const { canOpen } = checkDoorRequirements(door);
			if (canOpen) {
				await gameService.updateDoorState(fromRoomId, toRoomId, 'opened');
				await gameService.updateRoom(toRoomId, { found: true });
			} else {
				setSelectedDoor({ fromRoom, door });
				setShowDoorModal(true);
			}
		} else {
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
				await gameService.updateRoom(toRoomId, { found: true });
				await handleDoorOpenConsequences(fromRoomId, toRoomId);
			}
		}
	};

	// Update door state in database
	const updateDoorState = async (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		try {
			gameService.updateDoorState(fromRoomId, toRoomId, newState);
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
				const newAtmosphere = {
					...destinyStatus.atmosphere,
				} as DestinyStatusType['atmosphere'];
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 2);
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 1);
				console.log('⚠️ Atmospheric breach detected! O2 levels dropping due to damaged room connection.');
			} else if (toRoom?.status === 'destroyed') {
				const newAtmosphere = {
					...destinyStatus.atmosphere,
				} as DestinyStatusType['atmosphere'];
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 5);
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 2);
				console.log('🚨 CRITICAL BREACH! Massive atmospheric loss due to destroyed room exposure!');
			}
		}
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
					{rooms
						.map(room => {
							const position = getRoomScreenPosition(room);
							return (
								<ShipRoom
									key={room.id}
									room={room}
									position={position}
									isVisible={room.found}
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
							<p><strong>Door:</strong> {selectedDoor.door.description || `${selectedDoor.fromRoom.type} to ${selectedDoor.door.toRoomId}`}</p>

							<Alert variant="warning">
								This door is locked and requires the following to unlock:
							</Alert>

							{selectedDoor.door.requirements.map((req, index) => {
								const isReqMet = checkDoorRequirements({ ...selectedDoor.door, requirements: [req] }).canOpen;

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
