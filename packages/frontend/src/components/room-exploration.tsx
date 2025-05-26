import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import database, { gameService, Person, Room } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { FaClock } from 'react-icons/fa';
import { GiMeeple, GiCog } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import { RoomType } from '../types/model-types';

interface CrewMember {
	id: string;
	name: string;
	role: string;
	skills: string[];
	assignedTo?: string;
	description?: string;
	image?: string;
}

interface RoomExplorationProps {
	gameId: string;
	availableCrew: Person[];
	assignedCrew: Person[];
	rooms: Room[];
	selectedRoom: RoomType | null;
	showModal: boolean;
	onClose: () => void;
	onExplorationStart: (roomId: string, crewIds: string[]) => void;
}

const enhance = withObservables(['gameId'], ({ gameId }) => ({
	availableCrew: database.get<Person>('people').query(
		Q.where('game_id', gameId),
		Q.where('assigned_to', null),
	).observe(),
	assignedCrew: database.get<Person>('people').query(
		Q.where('game_id', gameId),
		Q.where('assigned_to', Q.notEq(null)),
	).observe(),
}));

const RoomExplorationComponent: React.FC<RoomExplorationProps> = ({
	gameId,
	availableCrew,
	assignedCrew,
	rooms,
	selectedRoom,
	showModal,
	onClose,
	onExplorationStart,
}) => {
	const { isPaused: gameStatePaused, gameTime } = useGameState();
	const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
	const [isManagingExploration, setIsManagingExploration] = useState(false);

	// Initialize selected crew when modal opens for ongoing exploration
	useEffect(() => {
		if (showModal && selectedRoom?.explorationData) {
			setSelectedCrew(selectedRoom.explorationData.crewAssigned);
			setIsManagingExploration(true);
		} else if (showModal) {
			setSelectedCrew([]);
			setIsManagingExploration(false);
		}
	}, [showModal, selectedRoom]);

	// Check if room can be explored
	const canExploreRoom = (room: RoomType): boolean => {
		if (!room.found) return false; // Must be found first
		if (room.explored) return false; // Already explored
		if (gameStatePaused) return false; // Game must be running
		if (room.explorationData) return false; // Already being explored

		// Must be adjacent to an unlocked room
		if (room.connectedRooms.length === 0) return false;
		const isAdjacentToUnlocked = room.connectedRooms.some((connectedId: string) => {
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

	// Update crew assignments for ongoing exploration
	const updateExplorationCrew = async (room: RoomType, newCrewIds: string[]) => {
		if (!room.explorationData) return;

		const baseTime = room.baseExplorationTime || 2;
		const crewMultiplier = Math.max(0.5, 1 / Math.max(1, newCrewIds.length));
		const newTimeRemaining = baseTime * crewMultiplier;

		try {
			// Update crew assignments in database
			const oldCrewIds = room.explorationData.crewAssigned;

			// Unassign removed crew
			for (const crewId of oldCrewIds) {
				if (!newCrewIds.includes(crewId)) {
					await gameService.assignCrewToRoom(crewId, null);
				}
			}

			// Assign new crew
			for (const crewId of newCrewIds) {
				if (!oldCrewIds.includes(crewId)) {
					await gameService.assignCrewToRoom(crewId, room.id);
				}
			}

			// Update exploration data with new crew and recalculated time
			const updatedExploration = {
				...room.explorationData,
				crewAssigned: newCrewIds,
				timeRemaining: newTimeRemaining,
			};

			await gameService.updateRoom(room.id, { explorationData: JSON.stringify(updatedExploration) });

			console.log(`🔄 Updated exploration crew for ${room.type}: ${newCrewIds.length} crew members`);
			onClose();
		} catch (error) {
			console.error('Failed to update exploration crew:', error);
		}
	};

	// Start room exploration
	const startExploration = async (room: RoomType, assignedCrewIds: string[]) => {
		if (!canExploreRoom(room) || assignedCrewIds.length === 0) return;

		const baseTime = room.baseExplorationTime || 2; // Default 2 hours
		const crewMultiplier = Math.max(0.5, 1 / assignedCrewIds.length); // More crew = faster
		const explorationTime = baseTime * crewMultiplier;

		try {
			// Assign crew to exploration in database
			for (const crewId of assignedCrewIds) {
				await gameService.assignCrewToRoom(crewId, room.id);
			}

			const newExploration = {
				roomId: room.id,
				progress: 0,
				crewAssigned: assignedCrewIds,
				timeRemaining: explorationTime,
				startTime: gameTime,
			};

			// Save exploration progress directly to room
			await gameService.updateRoom(room.id, { explorationData: JSON.stringify(newExploration) });

			console.log(`🔍 Started exploration of ${room.type} with ${assignedCrewIds.length} crew members`);

			// Notify parent component
			onExplorationStart(room.id, assignedCrewIds);

			// Reset selection and close modal
			setSelectedCrew([]);
			onClose();
		} catch (error) {
			console.error('Failed to start exploration:', error);
		}
	};

	// Get crew display name
	const getCrewDisplayName = (crew: CrewMember): string => {
		return crew.name || crew.id.replace('_', ' ');
	};

	// Calculate estimated time remaining for exploration
	const calculateTimeRemaining = (room: RoomType, crewCount: number): number => {
		const baseTime = room.baseExplorationTime || 2;
		const crewMultiplier = Math.max(0.5, 1 / Math.max(1, crewCount));
		return baseTime * crewMultiplier;
	};

	// Calculate actual time remaining for ongoing exploration
	const getActualTimeRemaining = (room: RoomType): string => {
		if (!room.explorationData) return 'Unknown';

		const timeElapsed = (gameTime - room.explorationData.startTime) / 1000 / 3600; // Convert to hours
		const totalTime = room.explorationData.timeRemaining;
		const remaining = Math.max(0, totalTime - timeElapsed);

		if (remaining < 1) {
			return `${Math.round(remaining * 60)} minutes`;
		}
		return `${remaining.toFixed(1)} hours`;
	};

	// Cancel ongoing exploration
	const cancelExploration = async (room: RoomType) => {
		if (!room.explorationData) return;

		try {
			// Free up assigned crew
			for (const crewId of room.explorationData.crewAssigned) {
				await gameService.assignCrewToRoom(crewId, null);
			}

			// Clear exploration data
			await gameService.clearExplorationProgress(room.id);

			console.log(`❌ Cancelled exploration of ${room.type}`);
			onClose();
		} catch (error) {
			console.error('Failed to cancel exploration:', error);
		}
	};

	// Convert database crew to CrewMember interface
	const convertDbCrewToCrewMember = (dbCrew: any): CrewMember => ({
		id: dbCrew.id,
		name: dbCrew.name,
		role: dbCrew.role,
		skills: JSON.parse(dbCrew.skills || '[]'),
		assignedTo: dbCrew.assignedTo,
		description: dbCrew.description,
		image: dbCrew.image,
	});

	const availableCrewMembers = availableCrew.map(convertDbCrewToCrewMember);
	const assignedCrewMembers = assignedCrew.filter(crew =>
		selectedRoom?.explorationData?.crewAssigned.includes(crew.id),
	).map(convertDbCrewToCrewMember);

	return (
		<>
			{/* Exploration Assignment Modal */}
			<Modal show={showModal} onHide={onClose} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>
						{isManagingExploration ? (
							<>
								<GiCog className="me-2" />
								Managing Exploration: {selectedRoom?.type?.replace('_', ' ')}
							</>
						) : (
							<>
								<GiMeeple className="me-2" />
								Explore {selectedRoom?.type?.replace('_', ' ')}
							</>
						)}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedRoom && (
						<div>
							{isManagingExploration && selectedRoom.explorationData ? (
								// Ongoing exploration management
								<div>
									<Alert variant="info" className="mb-3">
										<div className="d-flex align-items-center mb-2">
											<FaClock className="me-2" />
											<strong>Exploration in Progress</strong>
										</div>
										<ProgressBar
											now={selectedRoom.explorationData.progress}
											label={`${Math.round(selectedRoom.explorationData.progress)}%`}
											className="mb-2"
										/>
										<div className="d-flex justify-content-between">
											<span>Time Remaining: <strong>{getActualTimeRemaining(selectedRoom)}</strong></span>
											<span>Progress: <strong>{Math.round(selectedRoom.explorationData.progress)}%</strong></span>
										</div>
									</Alert>

									<p><strong>Technology:</strong> {selectedRoom.technology.join(', ') || 'None detected'}</p>
									<p>Manage crew assignments below. Changing crew will recalculate completion time.</p>

									{selectedCrew.length > 0 && (
										<Alert variant="warning" className="mb-3">
											<strong>New estimated time:</strong> {calculateTimeRemaining(selectedRoom, selectedCrew.length).toFixed(1)} hours
											{selectedCrew.length !== selectedRoom.explorationData.crewAssigned.length && (
												<div className="mt-1">
													<small>
														{selectedCrew.length > selectedRoom.explorationData.crewAssigned.length
															? '⚡ Adding crew will speed up exploration'
															: '⏳ Removing crew will slow down exploration'
														}
													</small>
												</div>
											)}
										</Alert>
									)}
								</div>
							) : (
								// New exploration setup
								<div>
									<p>Select crew members to explore this room. More crew members will speed up exploration.</p>
									<p><strong>Technology:</strong> {selectedRoom.technology.join(', ') || 'None detected'}</p>
									{selectedCrew.length > 0 && (
										<p>
											<strong>Estimated time:</strong> {calculateTimeRemaining(selectedRoom, selectedCrew.length).toFixed(1)} hours
										</p>
									)}
								</div>
							)}

							{/* Crew Selection Section */}
							<div className="mb-3">
								{isManagingExploration ? (
									// Show currently assigned crew for ongoing exploration
									<div>
										<strong>Currently Assigned Crew ({assignedCrewMembers.length}):</strong>
										<div className="mt-2 mb-3">
											{assignedCrewMembers.map(crew => (
												<Badge
													key={crew.id}
													bg={selectedCrew.includes(crew.id) ? 'success' : 'danger'}
													className="me-2 mb-2"
													style={{ cursor: 'pointer' }}
													onClick={() => toggleCrewSelection(crew.id)}
												>
													<GiMeeple className="me-1" />
													{getCrewDisplayName(crew)}
													{!selectedCrew.includes(crew.id) && ' (removing)'}
												</Badge>
											))}
										</div>
									</div>
								) : null}

								<strong>Available Crew ({availableCrewMembers.length}):</strong>
								<Button
									variant="outline-primary"
									size="sm"
									className="ms-2"
									onClick={() => {
										const allAvailableIds = availableCrewMembers.map(c => c.id);
										const currentlyAssignedIds = isManagingExploration ? assignedCrewMembers.map(c => c.id) : [];
										const allPossibleIds = [...new Set([...allAvailableIds, ...currentlyAssignedIds])];

										setSelectedCrew(
											selectedCrew.length === allPossibleIds.length
												? []
												: allPossibleIds,
										);
									}}
									disabled={availableCrewMembers.length === 0 && !isManagingExploration}
								>
									<GiMeeple className="me-1" />
									{selectedCrew.length === (availableCrewMembers.length + (isManagingExploration ? assignedCrewMembers.length : 0)) ? 'Unassign All' : 'Assign All'}
								</Button>
								{availableCrewMembers.length === 0 && !isManagingExploration && (
									<Alert variant="warning" className="mt-2">
									No crew members are currently available. All crew are assigned to rooms or exploring.
									</Alert>
								)}
								<div className="mt-2">
									{availableCrewMembers.map(crew => (
										<Badge
											key={crew.id}
											bg={selectedCrew.includes(crew.id) ? 'primary' : 'secondary'}
											className="me-2 mb-2"
											style={{ cursor: 'pointer' }}
											onClick={() => toggleCrewSelection(crew.id)}
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
										{selectedCrew.map(crewId => {
											const crew = availableCrewMembers.find(c => c.id === crewId);
											return crew ? (
												<Badge key={crewId} bg="success" className="me-2 mb-2">
													<GiMeeple className="me-1" />
													{getCrewDisplayName(crew)}
												</Badge>
											) : null;
										})}
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
					<Button variant="secondary" onClick={onClose}>
						Close
					</Button>

					{isManagingExploration ? (
						// Buttons for ongoing exploration management
						<>
							<Button
								variant="danger"
								onClick={() => selectedRoom && cancelExploration(selectedRoom)}
								disabled={gameStatePaused}
							>
								Cancel Exploration
							</Button>
							<Button
								variant="primary"
								onClick={() => selectedRoom && updateExplorationCrew(selectedRoom, selectedCrew)}
								disabled={gameStatePaused || selectedCrew.length === 0}
							>
								Update Crew ({selectedCrew.length} assigned)
							</Button>
						</>
					) : (
						// Button for starting new exploration
						<Button
							variant="primary"
							onClick={() => selectedRoom && startExploration(selectedRoom, selectedCrew)}
							disabled={gameStatePaused || selectedCrew.length === 0}
						>
							Start Exploration ({selectedCrew.length} crew)
						</Button>
					)}
				</Modal.Footer>
			</Modal>
		</>
	);
};

export const RoomExploration = enhance(RoomExplorationComponent);

// Export types for use in other components
export type { CrewMember };
