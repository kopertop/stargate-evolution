import { useQuery } from '@livestore/react';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { GiMeeple, GiCog } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import { useGameService } from '../services/use-game-service';
import { destinyStatusDataToType, DestinyStatusType, ExplorationProgress, personDataToType, PersonType, roomDataToType, RoomType } from '../types/model-types';

import { RoomExplorationProgress } from './room-exploration-progress';

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
	game_id: string;
	roomId: string;
	showModal: boolean;
	onClose: () => void;
	onExplorationStart: (roomId: string, crewIds: string[]) => void;
}

export const RoomExploration: React.FC<RoomExplorationProps> = ({
	game_id,
	roomId,
	showModal,
	onClose,
	onExplorationStart,
}) => {
	const { isPaused: gameStatePaused, gameTime } = useGameState();
	const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
	const [isManagingExploration, setIsManagingExploration] = useState(false);

	const gameService = useGameService();
	const roomsArr = useQuery(game_id ? gameService.queries.roomsByGame(game_id) : gameService.queries.roomsByGame('')) || [];
	const rooms: RoomType[] = roomsArr.map(roomDataToType);
	const peopleArr = useQuery(game_id ? gameService.queries.peopleByGame(game_id) : gameService.queries.peopleByGame('')) || [];
	const people: PersonType[] = peopleArr.map(personDataToType);
	const destinyStatusArr = useQuery(game_id ? gameService.queries.destinyStatus(game_id) : gameService.queries.destinyStatus('')) || [];
	const destinyStatus: DestinyStatusType | undefined = destinyStatusArr[0] ? destinyStatusDataToType(destinyStatusArr[0]) : undefined;

	const selectedRoom = rooms.find(r => r.id === roomId) || null;
	const availableCrew = people.filter(p => !p.assignedTo);
	const assignedCrew = people.filter(p => p.assignedTo === roomId);

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
		if (!room.found) return false;
		if (room.explored) return false;
		if (gameStatePaused) return false;
		if (room.explorationData) return false;
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
			const oldCrewIds = room.explorationData.crewAssigned;
			for (const crewId of oldCrewIds) {
				if (!newCrewIds.includes(crewId)) {
					await gameService.assignCrewToRoom(crewId, null);
				}
			}
			for (const crewId of newCrewIds) {
				if (!oldCrewIds.includes(crewId)) {
					await gameService.assignCrewToRoom(crewId, room.id);
				}
			}
			const updatedExploration = {
				...room.explorationData,
				crewAssigned: newCrewIds,
				timeRemaining: newTimeRemaining,
			};
			await gameService.updateRoom(room.id, { explorationData: JSON.stringify(updatedExploration) });
			onClose();
		} catch (error) {
			console.error('Failed to update exploration crew:', error);
		}
	};

	// Start room exploration
	const startExploration = async (room: RoomType, assignedCrewIds: string[]) => {
		if (!canExploreRoom(room) || assignedCrewIds.length === 0) return;
		const baseTime = room.baseExplorationTime || 2;
		const crewMultiplier = Math.max(0.5, 1 / assignedCrewIds.length);
		const explorationTime = baseTime * crewMultiplier;
		try {
			for (const crewId of assignedCrewIds) {
				await gameService.assignCrewToRoom(crewId, room.id);
			}
			const newExploration: ExplorationProgress = {
				roomId: room.id,
				progress: 0,
				crewAssigned: assignedCrewIds,
				timeRemaining: explorationTime,
				timeToComplete: explorationTime,
				startTime: gameTime,
			};
			await gameService.updateRoom(room.id, { explorationData: JSON.stringify(newExploration) });
			onExplorationStart(room.id, assignedCrewIds);
			setSelectedCrew([]);
			onClose();
		} catch (error) {
			console.error('Failed to start exploration:', error);
		}
	};

	const getCrewDisplayName = (crew: CrewMember): string => {
		return crew.name || crew.id.replace('_', ' ');
	};

	const calculateTimeRemaining = (room: RoomType, crewCount: number): number => {
		const baseTime = room.baseExplorationTime || 2;
		const crewMultiplier = Math.max(0.5, 1 / Math.max(1, crewCount));
		const pctTimeRemaining = 100 - (room.explorationData?.progress || 0);
		return (baseTime * crewMultiplier) * (pctTimeRemaining / 100);
	};

	const cancelExploration = async (room: RoomType) => {
		if (!room.explorationData) return;
		try {
			for (const crewId of room.explorationData.crewAssigned) {
				await gameService.assignCrewToRoom(crewId, null);
			}
			await gameService.clearExplorationProgress(room.id);
			onClose();
		} catch (error) {
			console.error('Failed to cancel exploration:', error);
		}
	};

	const availableCrewMembers = availableCrew;
	const assignedCrewMembers = assignedCrew.filter((crew) =>
		selectedRoom?.explorationData?.crewAssigned.includes(crew.id),
	);

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
									<RoomExplorationProgress roomId={selectedRoom.id} />

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

// Export types for use in other components
export type { CrewMember };
