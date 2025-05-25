import React, { useState, useEffect } from 'react';
import { Button, Modal, Badge } from 'react-bootstrap';
import type { DestinyStatus } from '@stargate/common/types/destiny';
import { CountdownClock } from './countdown-clock';
import { GiGalaxy } from 'react-icons/gi';

interface Room {
	id: string;
	name: string;
	type: string;
	status: 'locked' | 'damaged' | 'operational' | 'exploring' | 'empty' | 'unexplored';
	description: string;
	position: { x: number; y: number };
	discovered: boolean;
	requiredResources?: { [key: string]: number };
	requiredTime?: number;
	unlockedTechnology?: string[];
	doors: Door[];
}

interface Door {
	id: string;
	position: { x: number; y: number };
	direction: 'north' | 'south' | 'east' | 'west';
	type: 'door' | 'elevator' | 'hatch' | 'sealed';
	leadsTo: string; // Room ID
	unlocked: boolean;
}

interface GameTime {
	days: number;
	hours: number;
	ftlStatus: 'ftl' | 'normal_space';
	nextDropOut: number;
}

interface ShipMapProps {
	destinyStatus: DestinyStatus;
	onStatusUpdate: (newStatus: DestinyStatus) => void;
	onNavigateToGalaxy: () => void;
	gameTime: GameTime;
	onTimeAdvance: (hours: number) => void;
	onCountdownUpdate: (newTimeRemaining: number) => void;
}

// Predefined ship layout - Fixed room positions and connections
const SHIP_LAYOUT: { [roomId: string]: Room } = {
	// Starting room - Gate Room (MUCH LARGER)
	'gateroom': {
		id: 'gateroom',
		name: 'Gate Room',
		type: 'stargate',
		status: 'operational',
		description: 'The main stargate chamber. The heart of Destiny\'s exploration capabilities.',
		position: { x: 400, y: 300 },
		discovered: true,
		unlockedTechnology: ['stargate_operations'],
		doors: [
			{
				id: 'gate_north',
				position: { x: 400, y: 200 }, // Adjusted for larger room
				direction: 'north',
				type: 'door',
				leadsTo: 'corridor_north',
				unlocked: true
			},
			{
				id: 'gate_east',
				position: { x: 500, y: 300 }, // Adjusted for larger room
				direction: 'east',
				type: 'door',
				leadsTo: 'corridor_east',
				unlocked: true
			},
			{
				id: 'gate_west',
				position: { x: 300, y: 300 }, // Adjusted for larger room
				direction: 'west',
				type: 'hatch',
				leadsTo: 'storage_bay_1',
				unlocked: true
			}
		]
	},

	// North corridor from gate room
	'corridor_north': {
		id: 'corridor_north',
		name: 'North Corridor',
		type: 'corridor',
		status: 'unexplored',
		description: 'A long corridor leading north from the gate room.',
		position: { x: 400, y: 120 }, // Adjusted for larger gateroom
		discovered: false,
		doors: [
			{
				id: 'corridor_n_south',
				position: { x: 400, y: 160 }, // Adjusted for larger gateroom
				direction: 'south',
				type: 'door',
				leadsTo: 'gateroom',
				unlocked: true
			},
			{
				id: 'corridor_n_west',
				position: { x: 340, y: 120 },
				direction: 'west',
				type: 'door',
				leadsTo: 'bridge',
				unlocked: true
			},
			{
				id: 'corridor_n_east',
				position: { x: 460, y: 120 },
				direction: 'east',
				type: 'door',
				leadsTo: 'medical',
				unlocked: true
			},
			{
				id: 'corridor_n_north',
				position: { x: 400, y: 80 },
				direction: 'north',
				type: 'elevator',
				leadsTo: 'engineering',
				unlocked: true
			}
		]
	},

	// Bridge - West of north corridor
	'bridge': {
		id: 'bridge',
		name: 'Bridge',
		type: 'bridge',
		status: 'locked',
		description: 'Command center of the ship. Contains navigation and ship control systems.',
		position: { x: 240, y: 120 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'ancient_tech': 2, 'power': 50 },
		requiredTime: 8,
		unlockedTechnology: ['navigation_systems', 'ship_diagnostics'],
		doors: [
			{
				id: 'bridge_east',
				position: { x: 300, y: 120 },
				direction: 'east',
				type: 'door',
				leadsTo: 'corridor_north',
				unlocked: true
			},
			{
				id: 'bridge_north',
				position: { x: 240, y: 80 },
				direction: 'north',
				type: 'sealed',
				leadsTo: 'captain_quarters',
				unlocked: false
			}
		]
	},

	// Medical - East of north corridor
	'medical': {
		id: 'medical',
		name: 'Medical Bay',
		type: 'medical',
		status: 'damaged',
		description: 'Medical facility for treating crew injuries and illnesses.',
		position: { x: 560, y: 120 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'medicine': 3, 'parts': 2 },
		requiredTime: 6,
		unlockedTechnology: ['medical_scanner', 'surgical_suite'],
		doors: [
			{
				id: 'medical_west',
				position: { x: 500, y: 120 },
				direction: 'west',
				type: 'door',
				leadsTo: 'corridor_north',
				unlocked: true
			},
			{
				id: 'medical_north',
				position: { x: 560, y: 80 },
				direction: 'north',
				type: 'door',
				leadsTo: 'laboratory',
				unlocked: true
			}
		]
	},

	// Engineering - North of north corridor (elevator access)
	'engineering': {
		id: 'engineering',
		name: 'Engineering',
		type: 'engineering',
		status: 'locked',
		description: 'Main engineering section. Controls power distribution and ship systems.',
		position: { x: 400, y: 40 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'ancient_tech': 5, 'parts': 10 },
		requiredTime: 16,
		unlockedTechnology: ['power_management', 'system_repair', 'shield_control'],
		doors: [
			{
				id: 'engineering_south',
				position: { x: 400, y: 80 },
				direction: 'south',
				type: 'elevator',
				leadsTo: 'corridor_north',
				unlocked: true
			},
			{
				id: 'engineering_west',
				position: { x: 340, y: 40 },
				direction: 'west',
				type: 'hatch',
				leadsTo: 'power_core',
				unlocked: true
			}
		]
	},

	// East corridor from gate room
	'corridor_east': {
		id: 'corridor_east',
		name: 'East Corridor',
		type: 'corridor',
		status: 'unexplored',
		description: 'A corridor leading east from the gate room.',
		position: { x: 600, y: 300 }, // Adjusted for larger gateroom
		discovered: false,
		doors: [
			{
				id: 'corridor_e_west',
				position: { x: 540, y: 300 }, // Adjusted for larger gateroom
				direction: 'west',
				type: 'door',
				leadsTo: 'gateroom',
				unlocked: true
			},
			{
				id: 'corridor_e_north',
				position: { x: 600, y: 260 },
				direction: 'north',
				type: 'door',
				leadsTo: 'hydroponics',
				unlocked: true
			},
			{
				id: 'corridor_e_south',
				position: { x: 600, y: 340 },
				direction: 'south',
				type: 'door',
				leadsTo: 'crew_quarters',
				unlocked: true
			}
		]
	},

	// Hydroponics - North of east corridor
	'hydroponics': {
		id: 'hydroponics',
		name: 'Hydroponics Bay',
		type: 'hydroponics',
		status: 'locked',
		description: 'Food production facility. Essential for long-term survival.',
		position: { x: 600, y: 180 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'parts': 5, 'water': 10 },
		requiredTime: 12,
		unlockedTechnology: ['food_production', 'water_recycling'],
		doors: [
			{
				id: 'hydro_south',
				position: { x: 600, y: 220 },
				direction: 'south',
				type: 'door',
				leadsTo: 'corridor_east',
				unlocked: true
			}
		]
	},

	// Crew Quarters - South of east corridor
	'crew_quarters': {
		id: 'crew_quarters',
		name: 'Crew Quarters',
		type: 'quarters',
		status: 'locked',
		description: 'Living quarters for the crew. Contains personal belongings and rest areas.',
		position: { x: 600, y: 420 },
		discovered: false,
		requiredResources: { 'parts': 2 },
		requiredTime: 4,
		unlockedTechnology: ['crew_comfort'],
		doors: [
			{
				id: 'quarters_north',
				position: { x: 600, y: 380 },
				direction: 'north',
				type: 'door',
				leadsTo: 'corridor_east',
				unlocked: true
			},
			{
				id: 'quarters_west',
				position: { x: 540, y: 420 },
				direction: 'west',
				type: 'door',
				leadsTo: 'observation_deck',
				unlocked: true
			}
		]
	},

	// Storage Bay - West of gate room
	'storage_bay_1': {
		id: 'storage_bay_1',
		name: 'Storage Bay Alpha',
		type: 'storage',
		status: 'unexplored',
		description: 'Storage area containing various supplies and equipment.',
		position: { x: 200, y: 300 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'parts': 1 },
		requiredTime: 2,
		unlockedTechnology: ['inventory_management'],
		doors: [
			{
				id: 'storage_east',
				position: { x: 260, y: 300 }, // Adjusted for larger gateroom
				direction: 'east',
				type: 'hatch',
				leadsTo: 'gateroom',
				unlocked: true
			},
			{
				id: 'storage_south',
				position: { x: 200, y: 340 },
				direction: 'south',
				type: 'door',
				leadsTo: 'storage_bay_2',
				unlocked: true
			}
		]
	},

	// Additional rooms for exploration...
	'laboratory': {
		id: 'laboratory',
		name: 'Science Lab',
		type: 'laboratory',
		status: 'locked',
		description: 'Research facility for analyzing alien technology and specimens.',
		position: { x: 560, y: 40 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'ancient_tech': 3, 'parts': 3 },
		requiredTime: 10,
		unlockedTechnology: ['research_protocols', 'analysis_tools'],
		doors: [
			{
				id: 'lab_south',
				position: { x: 560, y: 80 },
				direction: 'south',
				type: 'door',
				leadsTo: 'medical',
				unlocked: true
			}
		]
	},

	'power_core': {
		id: 'power_core',
		name: 'Power Core',
		type: 'power',
		status: 'locked',
		description: 'The ship\'s main power generation facility.',
		position: { x: 240, y: 40 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'ancient_tech': 8, 'parts': 15 },
		requiredTime: 20,
		unlockedTechnology: ['advanced_power_systems', 'energy_weapons'],
		doors: [
			{
				id: 'power_east',
				position: { x: 300, y: 40 },
				direction: 'east',
				type: 'hatch',
				leadsTo: 'engineering',
				unlocked: true
			}
		]
	},

	'storage_bay_2': {
		id: 'storage_bay_2',
		name: 'Storage Bay Beta',
		type: 'storage',
		status: 'empty',
		description: 'Another storage area, mostly empty.',
		position: { x: 200, y: 420 },
		discovered: false,
		requiredResources: {},
		requiredTime: 1,
		unlockedTechnology: [],
		doors: [
			{
				id: 'storage2_north',
				position: { x: 200, y: 380 },
				direction: 'north',
				type: 'door',
				leadsTo: 'storage_bay_1',
				unlocked: true
			}
		]
	},

	'captain_quarters': {
		id: 'captain_quarters',
		name: 'Captain\'s Quarters',
		type: 'quarters',
		status: 'locked',
		description: 'Private quarters of the ship\'s captain.',
		position: { x: 240, y: 40 }, // Adjusted for larger gateroom
		discovered: false,
		requiredResources: { 'ancient_tech': 1 },
		requiredTime: 3,
		unlockedTechnology: ['command_codes'],
		doors: [
			{
				id: 'captain_south',
				position: { x: 240, y: 80 },
				direction: 'south',
				type: 'sealed',
				leadsTo: 'bridge',
				unlocked: false
			}
		]
	},

	'observation_deck': {
		id: 'observation_deck',
		name: 'Observation Deck',
		type: 'observation',
		status: 'operational',
		description: 'A viewing area with large windows showing the stars.',
		position: { x: 450, y: 420 },
		discovered: false,
		requiredResources: {},
		requiredTime: 1,
		unlockedTechnology: ['stellar_navigation'],
		doors: [
			{
				id: 'obs_east',
				position: { x: 510, y: 420 },
				direction: 'east',
				type: 'door',
				leadsTo: 'crew_quarters',
				unlocked: true
			}
		]
	}
};

export const ShipMap: React.FC<ShipMapProps> = ({
	destinyStatus,
	onStatusUpdate,
	onNavigateToGalaxy,
	gameTime,
	onTimeAdvance,
	onCountdownUpdate
}) => {
	const [rooms, setRooms] = useState<{ [roomId: string]: Room }>({});
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [showActionModal, setShowActionModal] = useState(false);
	const [hoveredElement, setHoveredElement] = useState<{ type: 'door' | 'room', id: string } | null>(null);
	const [stargateActive, setStargateActive] = useState(false); // State for stargate activation

	// Initialize ship layout
	useEffect(() => {
		// Start with only the gate room discovered
		const initialRooms = { ...SHIP_LAYOUT };
		setRooms(initialRooms);
	}, []);

	// Helper function to get room dimensions
	const getRoomDimensions = (room: Room) => {
		if (room.type === 'stargate') {
			// Make gateroom much larger
			return { width: 200, height: 160 };
		}
		// Standard room size
		return { width: 120, height: 80 };
	};

	// Helper function to toggle stargate state (for future use)
	const toggleStargate = () => {
		setStargateActive(!stargateActive);
	};

	const handleDoorClick = (doorId: string, fromRoomId: string) => {
		const fromRoom = rooms[fromRoomId];
		if (!fromRoom) return;

		const door = fromRoom.doors.find(d => d.id === doorId);
		if (!door || !door.unlocked) return;

		const targetRoomId = door.leadsTo;
		const targetRoom = rooms[targetRoomId];

		if (targetRoom && !targetRoom.discovered) {
			// Discover the room
			setRooms(prev => ({
				...prev,
				[targetRoomId]: {
					...prev[targetRoomId],
					discovered: true
				}
			}));

			// Advance time for exploration
			onTimeAdvance(1);
		}
	};

	const handleRoomAction = (room: Room) => {
		if (room.status === 'operational' || room.status === 'unexplored') return;
		setSelectedRoom(room);
		setShowActionModal(true);
	};

	const confirmRoomAction = () => {
		if (!selectedRoom) return;

		const actionType = selectedRoom.status === 'locked' ? 'unlock' : 'repair';
		const timeRequired = selectedRoom.requiredTime || 4;

		// Check resources
		const requiredResources = selectedRoom.requiredResources || {};
		const currentInventory = destinyStatus.inventory;

		for (const [resource, amount] of Object.entries(requiredResources)) {
			if ((currentInventory[resource] || 0) < amount) {
				alert(`Insufficient ${resource}. Need ${amount}, have ${currentInventory[resource] || 0}.`);
				return;
			}
		}

		// Consume resources
		const newInventory = { ...currentInventory };
		for (const [resource, amount] of Object.entries(requiredResources)) {
			newInventory[resource] = (newInventory[resource] || 0) - amount;
		}

		// Add unlocked technology
		if (selectedRoom.unlockedTechnology) {
			selectedRoom.unlockedTechnology.forEach(tech => {
				newInventory[tech] = (newInventory[tech] || 0) + 1;
			});
		}

		// Update room status
		setRooms(prev => ({
			...prev,
			[selectedRoom.id]: {
				...prev[selectedRoom.id],
				status: 'operational'
			}
		}));

		onStatusUpdate({
			...destinyStatus,
			inventory: newInventory
		});

		onTimeAdvance(timeRequired);
		setShowActionModal(false);
		setSelectedRoom(null);
	};

	const canAccessGalaxyMap = () => {
		return gameTime.ftlStatus === 'normal_space' &&
			   Object.values(rooms).some(r => r.type === 'bridge' && r.status === 'operational');
	};

	const getRoomColor = (room: Room) => {
		if (!room.discovered) return '#1a1a1a'; // Dark for unexplored

		switch (room.status) {
			case 'operational': return '#28a745';
			case 'damaged': return '#ffc107';
			case 'locked': return '#6c757d';
			case 'empty': return '#17a2b8';
			case 'unexplored': return '#444';
			default: return '#6c757d';
		}
	};

	const getDoorColor = (doorType: string, unlocked: boolean) => {
		if (!unlocked) return '#dc3545'; // Red for locked/sealed

		switch (doorType) {
			case 'elevator': return '#007bff';
			case 'sealed': return '#dc3545';
			case 'hatch': return '#fd7e14';
			default: return '#ffffff';
		}
	};

	return (
		<div className="ship-map" style={{ width: '100%', height: '600px', position: 'relative', background: '#0a0a0a', border: '2px solid #333' }}>
			{/* Countdown Clock - Top Center */}
			<CountdownClock timeRemaining={gameTime.nextDropOut} onTimeUpdate={onCountdownUpdate} />

			{/* Time and Status Header */}
			<div className="position-absolute top-0 start-0 bg-dark text-light p-2 m-2 rounded" style={{ zIndex: 10 }}>
				<small>
					Day {gameTime.days}, Hour {gameTime.hours} |
					<Badge bg={gameTime.ftlStatus === 'ftl' ? 'primary' : 'success'} className="ms-1">
						{gameTime.ftlStatus === 'ftl' ? 'FTL' : 'Normal Space'}
					</Badge>
				</small>
				{canAccessGalaxyMap() && (
					<Button
						variant="outline-light"
						size="sm"
						className="ms-2"
						onClick={onNavigateToGalaxy}
					>
						<GiGalaxy size={16} className="me-1" />Galaxy Map
					</Button>
				)}
			</div>

			{/* Ship Map SVG */}
			<svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
				{/* Define patterns and images */}
				<defs>
					{/* Floor tile pattern */}
					<pattern id="floorTile" patternUnits="userSpaceOnUse" width="64" height="64">
						<image href="/images/floor-tile.png" x="0" y="0" width="64" height="64" />
					</pattern>

					{/* Fog of war pattern */}
					<pattern id="fog" patternUnits="userSpaceOnUse" width="20" height="20">
						<rect width="20" height="20" fill="#111" opacity="0.8"/>
						<circle cx="10" cy="10" r="1" fill="#333"/>
					</pattern>
				</defs>

				{/* Render discovered rooms */}
				{Object.values(rooms).filter(room => room.discovered).map(room => {
					const dimensions = getRoomDimensions(room);
					const halfWidth = dimensions.width / 2;
					const halfHeight = dimensions.height / 2;

					return (
						<g key={room.id}>
							{/* Room floor background with tile pattern */}
							<rect
								x={room.position.x - halfWidth}
								y={room.position.y - halfHeight}
								width={dimensions.width}
								height={dimensions.height}
								fill="url(#floorTile)"
								opacity="0.8"
								rx="5"
							/>

							{/* Room border */}
							<rect
								x={room.position.x - halfWidth}
								y={room.position.y - halfHeight}
								width={dimensions.width}
								height={dimensions.height}
								fill="none"
								stroke="#fff"
								strokeWidth="2"
								rx="5"
								style={{ cursor: room.status !== 'operational' && room.status !== 'unexplored' ? 'pointer' : 'default' }}
								onClick={() => handleRoomAction(room)}
							/>

							{/* Room status overlay */}
							<rect
								x={room.position.x - halfWidth}
								y={room.position.y - halfHeight}
								width={dimensions.width}
								height={dimensions.height}
								fill={getRoomColor(room)}
								opacity="0.3"
								rx="5"
								style={{ cursor: room.status !== 'operational' && room.status !== 'unexplored' ? 'pointer' : 'default' }}
								onClick={() => handleRoomAction(room)}
							/>

							{/* Special rendering for stargate room */}
							{room.type === 'stargate' && (
								<g>
									{/* Stargate image in center of room */}
									<image
										href={stargateActive ? "/images/stargate-active.png" : "/images/stargate.png"}
										x={room.position.x - 60} // Center the 120px wide stargate
										y={room.position.y - 60} // Center the 120px high stargate
										width="120"
										height="120"
										style={{ cursor: 'pointer' }}
										onClick={toggleStargate}
									/>
								</g>
							)}

							{/* Room name */}
							<text
								x={room.position.x}
								y={room.position.y - halfHeight + 15}
								textAnchor="middle"
								fill="#fff"
								fontSize="12"
								fontWeight="bold"
								style={{ pointerEvents: 'none' }}
							>
								{room.name}
							</text>

							{/* Room status text */}
							{room.type !== 'stargate' && (
								<text
									x={room.position.x}
									y={room.position.y + 10}
									textAnchor="middle"
									fill="#fff"
									fontSize="10"
									style={{ pointerEvents: 'none' }}
								>
									{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
								</text>
							)}

							{/* Render doors */}
							{room.doors.map(door => {
								const targetRoom = rooms[door.leadsTo];
								const isTargetUndiscovered = !targetRoom?.discovered;

								return (
									<g key={door.id}>
										{/* Door rectangle */}
										<rect
											x={door.position.x - 10}
											y={door.position.y - 4}
											width={20}
											height={8}
											fill={getDoorColor(door.type, door.unlocked)}
											stroke="#ccc"
											strokeWidth="1"
											rx="2"
											style={{ cursor: isTargetUndiscovered && door.unlocked ? 'pointer' : 'default' }}
											onClick={() => isTargetUndiscovered && door.unlocked && handleDoorClick(door.id, room.id)}
											onMouseEnter={() => setHoveredElement({ type: 'door', id: door.id })}
											onMouseLeave={() => setHoveredElement(null)}
										/>

										{/* Door hover tooltip */}
										{hoveredElement?.type === 'door' && hoveredElement.id === door.id && (
											<text
												x={door.position.x}
												y={door.position.y - 15}
												textAnchor="middle"
												fill="#fff"
												fontSize="10"
												style={{ pointerEvents: 'none' }}
											>
												{isTargetUndiscovered ? (door.unlocked ? 'Explore' : 'Locked') : door.type}
											</text>
										)}

										{/* Show darkened room behind unexplored doors */}
										{isTargetUndiscovered && targetRoom && (
											<g opacity="0.3">
												{(() => {
													const targetDimensions = getRoomDimensions(targetRoom);
													const targetHalfWidth = targetDimensions.width / 2;
													const targetHalfHeight = targetDimensions.height / 2;

													return (
														<rect
															x={targetRoom.position.x - targetHalfWidth}
															y={targetRoom.position.y - targetHalfHeight}
															width={targetDimensions.width}
															height={targetDimensions.height}
															fill="#333"
															stroke="#666"
															strokeWidth="1"
															rx="5"
															strokeDasharray="4,4"
														/>
													);
												})()}
												<text
													x={targetRoom.position.x}
													y={targetRoom.position.y}
													textAnchor="middle"
													fill="#999"
													fontSize="10"
													style={{ pointerEvents: 'none' }}
												>
													Unexplored
												</text>
											</g>
										)}
									</g>
								);
							})}
						</g>
					);
				})}
			</svg>

			{/* Action Modal */}
			<Modal show={showActionModal} onHide={() => setShowActionModal(false)}>
				<Modal.Header closeButton style={{ background: '#1a1c2e', borderColor: '#333' }}>
					<Modal.Title className="text-light">
						{selectedRoom?.status === 'locked' ? 'Unlock Room' : 'Repair Room'}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body style={{ background: '#2a2c3e', color: '#fff' }}>
					{selectedRoom && (
						<div>
							<h5>{selectedRoom.name}</h5>
							<p>{selectedRoom.description}</p>

							<h6>This action will:</h6>
							<ul>
								<li>Take {selectedRoom.requiredTime} hours</li>
								{selectedRoom.requiredResources && Object.entries(selectedRoom.requiredResources).map(([resource, amount]) => (
									<li key={resource}>Use {amount} {resource} (have: {destinyStatus.inventory[resource] || 0})</li>
								))}
								{selectedRoom.unlockedTechnology && selectedRoom.unlockedTechnology.length > 0 && (
									<li>Unlock: {selectedRoom.unlockedTechnology.join(', ')}</li>
								)}
							</ul>
						</div>
					)}
				</Modal.Body>
				<Modal.Footer style={{ background: '#1a1c2e', borderColor: '#333' }}>
					<Button variant="secondary" onClick={() => setShowActionModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={confirmRoomAction}>
						Confirm
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};
