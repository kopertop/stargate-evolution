import { gameService } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { GiMeeple, GiCog, GiKey } from 'react-icons/gi';

import type { DestinyStatus, Room, DoorInfo, DoorRequirement } from '../types';
import { roomModelToType } from '../types';

import { CountdownClock } from './countdown-clock';
import { ShipRoom } from './ship-room';
import { getRoomScreenPosition as getGridRoomScreenPosition } from '../utils/grid-system';

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

interface GameTime {
	days: number;
	hours: number;
	ftlStatus: 'ftl' | 'normal_space';
	nextDropOut: number;
}

interface CameraTransform {
	x: number;
	y: number;
	scale: number;
}

interface ShipMapProps {
	destinyStatus: DestinyStatus;
	onStatusUpdate: (newStatus: DestinyStatus) => void;
	onNavigateToGalaxy: () => void;
	gameTime: GameTime;
	onTimeAdvance: (hours: number) => void;
	onCountdownUpdate: (newTimeRemaining: number) => void;
	gameIsPaused: boolean;
	gameId?: string;
}

export const ShipMap: React.FC<ShipMapProps> = ({
	destinyStatus,
	onStatusUpdate,
	onNavigateToGalaxy,
	gameTime,
	onTimeAdvance,
	onCountdownUpdate,
	gameIsPaused,
	gameId,
}) => {
	const [rooms, setRooms] = useState<Room[]>([]);
	const [explorationProgress, setExplorationProgress] = useState<{ [roomId: string]: ExplorationProgress }>({});
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [showExplorationModal, setShowExplorationModal] = useState(false);
	const [showDoorModal, setShowDoorModal] = useState(false);
	const [selectedDoor, setSelectedDoor] = useState<{ fromRoom: Room; door: DoorInfo } | null>(null);
	const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
	const [selectedCrew, setSelectedCrew] = useState<string[]>([]);

	// State for available crew
	const [availableCrew, setAvailableCrew] = useState<string[]>([]);
	const [crewData, setCrewData] = useState<{ [id: string]: any }>({});

	// Camera state for zooming and panning
	const [camera, setCamera] = useState<CameraTransform>({ x: 0, y: 0, scale: 1 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

	// Load rooms from database when component mounts or gameId changes
	useEffect(() => {
		const loadRooms = async () => {
			console.log('🏠 Loading rooms for gameId:', gameId);

			if (!gameId) {
				console.warn('No gameId provided, cannot load rooms');
				setRooms([]);
				return;
			}

			try {
				const roomData = await gameService.getRoomsByGame(gameId);
				console.log('🏠 Raw room data from database:', roomData);

				const formattedRooms: Room[] = roomData.map((room: any) => roomModelToType(room));

				console.log('🏠 Formatted rooms:', formattedRooms);
				console.log('🏠 Gate room specifically:', formattedRooms.find(r => r.type === 'gate_room'));

				setRooms(formattedRooms);
			} catch (error) {
				console.error('Failed to load rooms:', error);
				setRooms([]);
			}
		};

		loadRooms();
	}, [gameId]);

	// Auto-focus the SVG for keyboard controls
	useEffect(() => {
		const svgElement = document.querySelector('svg[tabindex="0"]') as SVGElement;
		if (svgElement) {
			svgElement.focus();
		}
	}, []);

	// Real-time exploration progress updates
	useEffect(() => {
		if (gameIsPaused) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const deltaRealSeconds = (now - lastUpdateTime) / 1000;
			setLastUpdateTime(now);

			setExplorationProgress(prev => {
				const updated = { ...prev };
				let hasChanges = false;

				Object.values(updated).forEach(exploration => {
					if (exploration.progress < 100) {
						// Calculate exploration speed based on crew count
						const crewCount = exploration.crewAssigned.length;
						const baseRate = 1; // 1% per real second base rate
						const crewMultiplier = Math.max(1, crewCount * 0.5); // Each crew member adds 50% speed
						const progressRate = baseRate * crewMultiplier;

						exploration.progress = Math.min(100, exploration.progress + (progressRate * deltaRealSeconds));
						exploration.timeRemaining = Math.max(0, exploration.timeRemaining - (deltaRealSeconds / 3600));
						hasChanges = true;

						// Complete exploration when done
						if (exploration.progress >= 100) {
							completeExploration(exploration.roomId);
						}
					}
				});

				return hasChanges ? updated : prev;
			});
		}, 100);

		return () => clearInterval(interval);
	}, [gameIsPaused, lastUpdateTime]);

	// Complete room exploration
	const completeExploration = async (roomId: string) => {
		// Get exploration data before removing it
		const exploration = explorationProgress[roomId];

		setRooms(prev => prev.map(room =>
			room.id === roomId
				? { ...room, unlocked: true }
				: room,
		));

		setExplorationProgress(prev => {
			const updated = { ...prev };
			delete updated[roomId];
			return updated;
		});

		// Update database
		if (gameId) {
			try {
				await gameService.updateRoom(roomId, { found: true });
			} catch (error) {
				console.error('Failed to update room in database:', error);
			}
		}

		// Release crew from exploration assignments
		if (exploration) {
			try {
				for (const crewId of exploration.crewAssigned) {
					await gameService.assignCrewToRoom(crewId, null); // Unassign crew
				}
				console.log(`Crew returned from exploration: ${exploration.crewAssigned.map(id => getCrewDisplayName(id)).join(', ')}`);

				// Update available crew list
				const updatedCrew = await getAvailableCrew();
				setAvailableCrew(updatedCrew);
			} catch (error) {
				console.error('Failed to release crew from exploration:', error);
			}
		}

		// Add discovered technology to inventory or unlock new systems
		const room = rooms.find(r => r.id === roomId);
		if (room && room.technology && room.technology.length > 0) {
			// This would update the game state with new technology
			console.log(`Discovered technology in ${room.type}:`, room.technology);

			// Add technology to inventory
			const newInventory = { ...destinyStatus.inventory };
			room.technology.forEach(tech => {
				newInventory[tech] = (newInventory[tech] || 0) + 1;
			});

			onStatusUpdate({
				...destinyStatus,
				inventory: newInventory,
			});
		}
	};

	// Check if room is visible (only found rooms are visible)
	const isRoomVisible = (room: Room): boolean => {
		// Only show rooms that have been found
		return room.found;
	};

	// Check if room can be explored (found but not unlocked rooms adjacent to unlocked rooms)
	const canExploreRoom = (room: Room): boolean => {
		if (room.locked) return false; // Room is locked
		if (!room.found) return false; // Must be found first
		if (gameIsPaused) return false; // Game must be running
		if (explorationProgress[room.id]) return false; // Already being explored

		// Must be adjacent to an unlocked room
		const isAdjacentToUnlocked = room.connectedRooms.some(connectedId => {
			const connectedRoom = rooms.find(r => r.id === connectedId);
			return connectedRoom?.found || false;
		});

		return isAdjacentToUnlocked;
	};

	// Toggle crew selection
	const toggleCrewSelection = (crewMember: string) => {
		setSelectedCrew(prev =>
			prev.includes(crewMember)
				? prev.filter(c => c !== crewMember)
				: [...prev, crewMember],
		);
	};

	// Start room exploration
	const startExploration = async (room: Room, assignedCrew: string[]) => {
		if (!canExploreRoom(room) || assignedCrew.length === 0) return;

		const baseTime = 2; // 2 hours base exploration time
		const crewMultiplier = Math.max(0.5, 1 / assignedCrew.length); // More crew = faster
		const explorationTime = baseTime * crewMultiplier;

		// Assign crew to exploration in database (temporarily assign to room)
		try {
			for (const crewId of assignedCrew) {
				await gameService.assignCrewToRoom(crewId, room.id);
			}
		} catch (error) {
			console.error('Failed to assign crew to exploration:', error);
			return;
		}

		setExplorationProgress(prev => ({
			...prev,
			[room.id]: {
				roomId: room.id,
				progress: 0,
				crewAssigned: assignedCrew,
				timeRemaining: explorationTime,
				startTime: Date.now(),
			},
		}));

		setShowExplorationModal(false);
		setSelectedRoom(null);
		setSelectedCrew([]);

		// Update available crew list
		const updatedCrew = await getAvailableCrew();
		setAvailableCrew(updatedCrew);
	};

	// Handle room click
	const handleRoomClick = (room: Room) => {
		if (!isRoomVisible(room)) return;

		if (canExploreRoom(room)) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
		} else if (!room.locked) {
			// Show room details or allow crew assignment
			console.log(`Accessing ${room.type}`);
		} else if (gameIsPaused) {
			// Show message about needing to unpause
			console.log('Game must be running to explore rooms');
		}
	};

	// Convert room coordinates to screen position using grid system
	const getRoomScreenPosition = (room: Room) => {
		return getGridRoomScreenPosition(room);
	};

	// Get connected rooms for a room
	const getConnectedRooms = (room: Room): Room[] => {
		return room.connectedRooms
			.map(roomId => rooms.find(r => r.id === roomId))
			.filter(Boolean) as Room[];
	};

	// Helper function to check if door is opened between two rooms
	const isDoorOpened = (fromRoomId: string, toRoomId: string): boolean => {
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		if (!fromRoom) return false;

		const door = fromRoom.doors.find(d => d.toRoomId === toRoomId);
		return door?.state === 'opened';
	};

	// Helper function to convert room doors to DoorState format
	const getRoomDoorStates = (room: Room): DoorState => {
		const doorStates: DoorState = {};
		room.doors.forEach(door => {
			const doorId = `${room.id}-${door.toRoomId}`;
			doorStates[doorId] = door.state === 'opened';
		});
		return doorStates;
	};

	// Note: Door rendering is now integrated into room walls in ShipRoom component
	// This function is no longer needed but kept as a comment for reference

	// Check if door requirements are met
	const checkDoorRequirements = (door: DoorInfo): { canOpen: boolean; unmetRequirements: DoorRequirement[] } => {
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
				met = destinyStatus.inventory && destinyStatus.inventory[requirement.value] > 0;
				break;
			case 'technology':
				met = destinyStatus.inventory && destinyStatus.inventory[requirement.value] > 0;
				break;
			case 'crew_skill':
				// For now, assume we have qualified crew if they're available
				met = availableCrew.length > 0;
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
		const fromRoom = rooms.find(r => r.id === fromRoomId);
		if (!fromRoom) return;

		const door = fromRoom.doors.find(d => d.toRoomId === toRoomId);
		if (!door) return;

		if (door.state === 'locked') {
			// Check if requirements are met
			const { canOpen, unmetRequirements } = checkDoorRequirements(door);

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
			await updateDoorState(fromRoomId, toRoomId, newState);

			// If opening a door, mark the connected room as found
			if (newState === 'opened') {
				await markRoomAsFound(toRoomId);
			}
		}
	};

	// Mark a room as found (discovered)
	const markRoomAsFound = async (roomId: string) => {
		// Update local state
		setRooms(prev => prev.map(room =>
			room.id === roomId
				? { ...room, found: true }
				: room,
		));

		// Update database
		if (gameId) {
			try {
				await gameService.updateRoom(roomId, { found: true } as any);
			} catch (error) {
				console.error('Failed to update room found status in database:', error);
			}
		}
	};

	// Update door state in database and local state
	const updateDoorState = async (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		// Update local state
		setRooms(prev => prev.map(room => {
			if (room.id === fromRoomId) {
				const updatedDoors = room.doors.map(door =>
					door.toRoomId === toRoomId
						? { ...door, state: newState }
						: door,
				);
				return { ...room, doors: updatedDoors };
			}
			return room;
		}));

		// Update database if gameId is available
		if (gameId) {
			try {
				// This would need a new method in gameService to update door states
				// For now, we'll just update locally
				console.log(`Door ${fromRoomId} -> ${toRoomId} set to ${newState}`);
			} catch (error) {
				console.error('Failed to update door state in database:', error);
			}
		}
	};

	// Calculate available crew (not assigned to any room)
	const getAvailableCrew = async (): Promise<string[]> => {
		if (!gameId) return [];

		try {
			// Get available crew from database
			const availableCrew = await gameService.getAvailableCrew(gameId);
			return availableCrew.map((person: any) => person.id);
		} catch (error) {
			console.error('Failed to get available crew:', error);
			return [];
		}
	};

	// Load available crew when component mounts or gameId changes
	useEffect(() => {
		const loadAvailableCrew = async () => {
			const crew = await getAvailableCrew();
			setAvailableCrew(crew);

			// Also load all crew data for display purposes
			if (gameId) {
				try {
					const allCrew = await gameService.getCrewByGame(gameId);
					const crewMap = allCrew.reduce((acc: any, person: any) => {
						acc[person.id] = person;
						return acc;
					}, {});
					setCrewData(crewMap);
				} catch (error) {
					console.error('Failed to load crew data:', error);
				}
			}
		};
		loadAvailableCrew();
	}, [gameId]);

	// Update available crew when exploration progress changes
	useEffect(() => {
		const updateAvailableCrew = async () => {
			const crew = await getAvailableCrew();
			setAvailableCrew(crew);
		};
		updateAvailableCrew();
	}, [explorationProgress]);

	// Keyboard controls for camera movement and zoom
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Prevent default behavior for our handled keys
			if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', '+', '-', '='].includes(e.key.toLowerCase())) {
				e.preventDefault();
			}

			const panSpeed = 20 / camera.scale; // Adjust pan speed based on zoom level
			const zoomSpeed = 0.1;

			switch (e.key.toLowerCase()) {
			case 'w':
			case 'arrowup':
				setCamera(prev => ({ ...prev, y: prev.y - panSpeed }));
				break;
			case 's':
			case 'arrowdown':
				setCamera(prev => ({ ...prev, y: prev.y + panSpeed }));
				break;
			case 'a':
			case 'arrowleft':
				setCamera(prev => ({ ...prev, x: prev.x - panSpeed }));
				break;
			case 'd':
			case 'arrowright':
				setCamera(prev => ({ ...prev, x: prev.x + panSpeed }));
				break;
			case '+':
			case '=':
				setCamera(prev => ({
					...prev,
					scale: Math.min(prev.scale + zoomSpeed, 3) // Max zoom 3x
				}));
				break;
			case '-':
				setCamera(prev => ({
					...prev,
					scale: Math.max(prev.scale - zoomSpeed, 0.2) // Min zoom 0.2x
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
		setDragStart({ x: e.clientX, y: e.clientY });
		setLastMousePos({ x: e.clientX, y: e.clientY });
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;

		const deltaX = e.clientX - lastMousePos.x;
		const deltaY = e.clientY - lastMousePos.y;

		setCamera(prev => ({
			...prev,
			x: prev.x + deltaX / prev.scale,
			y: prev.y + deltaY / prev.scale,
		}));

		setLastMousePos({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const zoomSpeed = 0.001;
		const delta = -e.deltaY * zoomSpeed;

		setCamera(prev => ({
			...prev,
			scale: Math.max(0.2, Math.min(3, prev.scale + delta)),
		}));
	};

	// Helper function to get crew display name
	const getCrewDisplayName = (crewId: string): string => {
		const crew = crewData[crewId];
		return crew ? crew.name : crewId.replace('_', ' ');
	};

	// Reset camera to default position and zoom
	const resetCamera = () => {
		setCamera({ x: 0, y: 0, scale: 1 });
	};

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
			{/* Countdown Clock */}
			<CountdownClock
				timeRemaining={gameTime.nextDropOut}
				onTimeUpdate={onCountdownUpdate}
			/>

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
				style={{ position: 'absolute', top: 0, left: 0, cursor: isDragging ? 'grabbing' : 'grab' }}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onWheel={handleWheel}
				tabIndex={0} // Make SVG focusable for keyboard events
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
						.filter(isRoomVisible)
						.map(room => {
							console.log('🏠 Rendering room:', room.type, 'at position:', getRoomScreenPosition(room));
							return (
								<ShipRoom
									key={room.id}
									room={room}
									position={getRoomScreenPosition(room)}
									isVisible={isRoomVisible(room)}
									canExplore={canExploreRoom(room)}
									exploration={explorationProgress[room.id]}
									connectedRooms={getConnectedRooms(room)}
									onRoomClick={handleRoomClick}
									onDoorClick={handleDoorClick}
									doorStates={getRoomDoorStates(room)}
									allRooms={rooms}
								/>
							);
						})
					}

					{/* Doors are now rendered as part of room walls in ShipRoom component */}
				</g>
			</svg>

			{/* Exploration Assignment Modal */}
			<Modal show={showExplorationModal} onHide={() => setShowExplorationModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Explore {selectedRoom?.type?.replace('_', ' ')}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedRoom && (
						<div>
							<p>Select crew members to explore this room. More crew members will speed up exploration.</p>
							<p><strong>Technology:</strong> {selectedRoom.technology.join(', ') || 'None detected'}</p>
							<p><strong>Estimated time:</strong> {2 / Math.max(1, selectedCrew.length)} hours</p>

							<div className="mb-3">
								<strong>Available Crew ({availableCrew.length}):</strong>
								{availableCrew.length === 0 && (
									<Alert variant="warning" className="mt-2">
										No crew members are currently available. All crew are assigned to rooms or exploring.
									</Alert>
								)}
								<div className="mt-2">
									{availableCrew.map(crew => (
										<Badge
											key={crew}
											bg={selectedCrew.includes(crew) ? 'primary' : 'secondary'}
											className="me-2 mb-2"
											style={{ cursor: 'pointer' }}
											onClick={() => toggleCrewSelection(crew)}
										>
											<GiMeeple className="me-1" />
											{getCrewDisplayName(crew)}
										</Badge>
									))}
								</div>
							</div>

							{selectedCrew.length > 0 && (
								<div className="mb-3">
									<strong>Selected for Exploration ({selectedCrew.length}):</strong>
									<div className="mt-2">
										{selectedCrew.map(crew => (
											<Badge key={crew} bg="success" className="me-2 mb-2">
												<GiMeeple className="me-1" />
												{getCrewDisplayName(crew)}
											</Badge>
										))}
									</div>
								</div>
							)}

							{gameIsPaused && (
								<Alert variant="warning">
									<GiCog className="me-2" />
									Game must be running to explore rooms. Click play on the countdown timer.
								</Alert>
							)}
						</div>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowExplorationModal(false)}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={() => selectedRoom && startExploration(selectedRoom, selectedCrew)}
						disabled={gameIsPaused || selectedCrew.length === 0}
					>
						Start Exploration ({selectedCrew.length} crew)
					</Button>
				</Modal.Footer>
			</Modal>

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
										{req.type === 'power_level' && (
											<div className="mt-1">
												<small>Required: {req.value} | Current: {destinyStatus.power}</small>
											</div>
										)}
										{(req.type === 'item' || req.type === 'technology') && (
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
		</div>
	);
};
