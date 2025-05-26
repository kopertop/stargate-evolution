import { gameService } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { GiMeeple, GiCog, GiKey, GiPauseButton } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import type { DestinyStatus, Room, DoorInfo, DoorRequirement } from '../types';
import { roomModelToType } from '../types';
import { getRoomScreenPosition as getGridRoomScreenPosition } from '../utils/grid-system';

import { CountdownClock } from './countdown-clock';
import { ShipDoors } from './ship-doors';
import { ShipRoom } from './ship-room';

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
	const { isPaused: gameStatePaused, resumeGame } = useGameState();
	const [rooms, setRooms] = useState<Room[]>([]);
	const [explorationProgress, setExplorationProgress] = useState<{ [roomId: string]: ExplorationProgress }>({});
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [showExplorationModal, setShowExplorationModal] = useState(false);
	const [showDoorModal, setShowDoorModal] = useState(false);
	const [selectedDoor, setSelectedDoor] = useState<{ fromRoom: Room; door: DoorInfo } | null>(null);
	const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
	const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
	const [showDangerWarning, setShowDangerWarning] = useState(false);
	const [dangerousDoor, setDangerousDoor] = useState<{ fromRoomId: string; toRoomId: string; reason: string } | null>(null);

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

				const formattedRooms: Room[] = roomData.map((room: any) => {
					const formattedRoom = roomModelToType(room);

					if (formattedRoom.type === 'gate_room') {
						console.log('🏠 Gate room raw data:', { found: room.found, locked: room.locked });
						console.log('🏠 Gate room formatted:', { found: formattedRoom.found, locked: formattedRoom.locked });
					}
					return formattedRoom;
				});

				console.log('🏠 Formatted rooms:', formattedRooms);
				console.log('🏠 Gate room specifically:', formattedRooms.find(r => r.type === 'gate_room'));

				setRooms(formattedRooms);

				// Load exploration progress from database
				const savedExplorationProgress = await gameService.loadExplorationProgress(gameId);
				console.log('🔍 Loaded exploration progress:', savedExplorationProgress);
				setExplorationProgress(savedExplorationProgress);
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
		if (gameStatePaused) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const deltaRealSeconds = (now - lastUpdateTime) / 1000;
			setLastUpdateTime(now);

			setExplorationProgress(prev => {
				const updated = { ...prev };
				let hasChanges = false;

				Object.values(updated).forEach(exploration => {
					if (exploration.progress < 100) {
						// Calculate exploration speed based on crew count and game time
						const crewCount = exploration.crewAssigned.length;
						const baseRate = 0.5; // 0.5% per real second base rate (slower than before)
						const crewMultiplier = Math.max(1, crewCount * 0.5); // Each crew member adds 50% speed

						// Game time multiplier - exploration should progress based on game time, not real time
						// If game is running at normal speed, this should be 1
						// The game time advancement happens in ship-view.tsx based on countdown
						const gameTimeMultiplier = gameIsPaused ? 0 : 1;

						const progressRate = baseRate * crewMultiplier * gameTimeMultiplier;

						exploration.progress = Math.min(100, exploration.progress + (progressRate * deltaRealSeconds));
						exploration.timeRemaining = Math.max(0, exploration.timeRemaining - (deltaRealSeconds / 3600));
						hasChanges = true;

						// Complete exploration when done
						if (exploration.progress >= 100) {
							completeExploration(exploration.roomId);
						}
					}
				});

				// Save progress to database every 10 seconds if there are changes
				if (hasChanges && gameId && Date.now() % 10000 < 1000) {
					gameService.saveExplorationProgress(gameId, updated).catch(error => {
						console.error('Failed to save exploration progress:', error);
					});
				}

				return hasChanges ? updated : prev;
			});
		}, 100);

		return () => clearInterval(interval);
	}, [gameStatePaused, lastUpdateTime, gameIsPaused]);

	// Complete room exploration
	const completeExploration = async (roomId: string) => {
		// Get exploration data before removing it
		const exploration = explorationProgress[roomId];

		setRooms(prev => prev.map(room =>
			room.id === roomId
				? { ...room, found: true, locked: false }
				: room,
		));

		setExplorationProgress(prev => {
			const updated = { ...prev };
			delete updated[roomId];
			return updated;
		});

		// Update database - set both found and unlocked, and clear exploration progress
		if (gameId) {
			try {
				await gameService.updateRoom(roomId, { found: true, locked: false } as any);
				await gameService.clearExplorationProgress(roomId);
				console.log(`✅ Room ${roomId} exploration completed and marked as unlocked`);
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

	// Check if room can be explored (found but locked rooms adjacent to unlocked rooms)
	const canExploreRoom = (room: Room): boolean => {
		if (!room.found) return false; // Must be found first
		if (room.explored) return false; // Already explored, no need to explore
		if (gameStatePaused) return false; // Game must be running
		if (explorationProgress[room.id]) return false; // Already being explored

		// Must be adjacent to an unlocked room
		const isAdjacentToUnlocked = room.connectedRooms.some(connectedId => {
			const connectedRoom = rooms.find(r => r.id === connectedId);
			return !(connectedRoom?.locked || false);
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

		const newExploration = {
			roomId: room.id,
			progress: 0,
			crewAssigned: assignedCrew,
			timeRemaining: explorationTime,
			startTime: Date.now(),
		};

		setExplorationProgress(prev => ({
			...prev,
			[room.id]: newExploration,
		}));

		// Save exploration progress to database
		if (gameId) {
			try {
				await gameService.saveExplorationProgress(gameId, { [room.id]: newExploration });
				console.log(`🔍 Started exploration of ${room.type} with ${assignedCrew.length} crew members`);
			} catch (error) {
				console.error('Failed to save exploration progress:', error);
			}
		}

		setShowExplorationModal(false);
		setSelectedRoom(null);
		setSelectedCrew([]);

		// Update available crew list
		const updatedCrew = await getAvailableCrew();
		setAvailableCrew(updatedCrew);
	};

	// Handle room click
	const handleRoomClick = (room: Room) => {
		if (!isRoomVisible(room) || gameStatePaused) return;

		if (canExploreRoom(room)) {
			setSelectedRoom(room);
			setShowExplorationModal(true);
		} else if (!room.locked) {
			// Show room details or allow crew assignment
			console.log(`Accessing ${room.type}`);
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
		if (gameStatePaused) return; // Prevent door interaction when paused

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
		// Update local state - set found
		setRooms(prev => prev.map(room =>
			room.id === roomId
				? { ...room, found: true }
				: room,
		));

		// Update database - set found
		if (gameId) {
			try {
				await gameService.updateRoom(roomId, { found: true } as any);
			} catch (error) {
				console.error('Failed to update room found status in database:', error);
			}
		}
	};

	// Handle consequences of opening a door (atmospheric effects, etc.)
	const handleDoorOpenConsequences = async (fromRoomId: string, toRoomId: string) => {
		const { isDangerous } = checkDoorDanger(fromRoomId, toRoomId);

		if (isDangerous) {
			const toRoom = rooms.find(r => r.id === toRoomId);

			if (toRoom?.status === 'damaged') {
				// Moderate atmospheric loss
				const newAtmosphere = { ...destinyStatus.atmosphere };
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 2); // Lose 2% O2
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 1); // Gain 1% CO2

				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});

				console.log('⚠️ Atmospheric breach detected! O2 levels dropping due to damaged room connection.');
			} else if (toRoom?.status === 'destroyed') {
				// Severe atmospheric loss
				const newAtmosphere = { ...destinyStatus.atmosphere };
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - 5); // Lose 5% O2
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + 2); // Gain 2% CO2

				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});

				console.log('🚨 CRITICAL BREACH! Massive atmospheric loss due to destroyed room exposure!');
			}
		}
	};

	// Update door state in database and local state
	const updateDoorState = async (fromRoomId: string, toRoomId: string, newState: 'closed' | 'opened' | 'locked') => {
		// Update database first
		if (gameId) {
			try {
				await gameService.updateDoorState(fromRoomId, toRoomId, newState);
				console.log(`Door ${fromRoomId} -> ${toRoomId} set to ${newState}`);
			} catch (error) {
				console.error('Failed to update door state in database:', error);
				return; // Don't update local state if database update fails
			}
		}

		// Update local state (bidirectional)
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

	// Monitor open dangerous doors for continuous atmospheric drain
	useEffect(() => {
		if (gameStatePaused) return;

		const interval = setInterval(() => {
			// Check for open doors to dangerous rooms
			let hasOpenDangerousDoor = false;
			let severityMultiplier = 0;

			rooms.forEach(room => {
				room.doors.forEach(door => {
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
				});
			});

			// Apply continuous atmospheric drain if dangerous doors are open
			if (hasOpenDangerousDoor && severityMultiplier > 0) {
				const drainRate = 0.1 * severityMultiplier; // Base drain per second

				const newAtmosphere = { ...destinyStatus.atmosphere };
				newAtmosphere.o2 = Math.max(0, newAtmosphere.o2 - drainRate);
				newAtmosphere.co2 = Math.min(10, newAtmosphere.co2 + (drainRate * 0.5));

				onStatusUpdate({
					...destinyStatus,
					atmosphere: newAtmosphere,
				});

				// Log warning every 10 seconds
				if (Date.now() % 10000 < 1000) {
					console.log(`🚨 Atmospheric breach ongoing! O2: ${newAtmosphere.o2.toFixed(1)}% | CO2: ${newAtmosphere.co2.toFixed(1)}%`);
				}
			}
		}, 1000); // Check every second

		return () => clearInterval(interval);
	}, [gameStatePaused, rooms, destinyStatus.atmosphere, onStatusUpdate]);

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
		setDragStart({ x: e.clientX, y: e.clientY });
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
		e.preventDefault();
		const zoomSpeed = 0.005;
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

							{gameStatePaused && (
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
						disabled={gameStatePaused || selectedCrew.length === 0}
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
