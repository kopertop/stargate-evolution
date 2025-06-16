import { useQuery } from '@livestore/react';
import { ExplorationProgress, RoomTemplate } from '@stargate/common';
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import { GiMeeple, GiCog } from 'react-icons/gi';

import { useGameState } from '../contexts/game-state-context';
import { useGameService } from '../services/game-service';

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
	const [explorationData, setExplorationData] = useState<ExplorationProgress | null>(null);

	const gameService = useGameService();
	const rooms = useQuery(gameService.queries.roomsByGame(game_id));
	const people = useQuery(gameService.queries.peopleByGame(game_id));

	const selectedRoom = rooms.find(r => r.id === roomId) || null;
	const availableCrew = people.filter(p => !p.assigned_to);
	const assignedCrew = people.filter(p => p.assigned_to === roomId);

	// Initialize selected crew when modal opens for ongoing exploration
	useEffect(() => {
		if (selectedRoom?.exploration_data) {
			setExplorationData(JSON.parse(selectedRoom.exploration_data || '{}'));
		}
		if (showModal && selectedRoom?.exploration_data) {
			setSelectedCrew(people.filter(p => p.assigned_to === roomId).map(p => p.id));
			setIsManagingExploration(true);
		} else if (showModal) {
			setSelectedCrew([]);
			setIsManagingExploration(false);
		}
	}, [showModal, selectedRoom]);

	// Check if room can be explored
	const canExploreRoom = (room: RoomTemplate): boolean => {

		if (!room.found) return false;
		if (room.explored) return false;
		if (gameStatePaused) return false;
		if (room.exploration_data) return false;
		return true;
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
	const updateExplorationCrew = async (room: RoomTemplate, newCrewIds: string[]) => {
		if (!room.exploration_data) return;
		const baseTime = room.base_exploration_time || 2;
		const crewMultiplier = Math.max(0.5, 1 / Math.max(1, newCrewIds.length));

		try {
			const explorationData = JSON.parse(room.exploration_data);
			const oldCrewIds = explorationData.crewAssigned || explorationData.crew_assigned || [];

			// Update crew assignments
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

			// Recalculate time remaining based on current progress
			const currentProgress = explorationData.progress || 0;
			const remainingProgressPercent = (100 - currentProgress) / 100;
			const newTimeRemaining = baseTime * crewMultiplier * remainingProgressPercent;

			const updatedExploration = {
				...explorationData,
				crew_assigned: newCrewIds,
				crewAssigned: newCrewIds, // camelCase version for backward compatibility
				time_remaining: newTimeRemaining,
				timeRemaining: newTimeRemaining, // camelCase version for backward compatibility
				timeToComplete: baseTime * crewMultiplier, // Update total time for new crew size
			};
			await gameService.updateRoom(room.id, { exploration_data: JSON.stringify(updatedExploration) });
			onClose();
		} catch (error) {
			console.error('Failed to update exploration crew:', error);
		}
	};

	// Start room exploration
	const startExploration = async (room: RoomTemplate, assignedCrewIds: string[]) => {
		console.log('startExploration', {
			canExploreRoom: canExploreRoom(room),
			room,
			assignedCrewIds,
		});
		if (!canExploreRoom(room) || assignedCrewIds.length === 0) return;
		const baseTime = room.base_exploration_time || 2;
		const crewMultiplier = Math.max(0.5, 1 / assignedCrewIds.length);
		const explorationTime = baseTime * crewMultiplier;
		try {
			for (const crewId of assignedCrewIds) {
				await gameService.assignCrewToRoom(crewId, room.id);
			}

			const newExploration = {
				room_id: room.id,
				progress: 0,
				crew_assigned: assignedCrewIds,
				time_remaining: explorationTime,
				// Fields needed by game loop
				startTime: gameTime,
				timeToComplete: explorationTime,
				crewAssigned: assignedCrewIds, // camelCase version for backward compatibility
			};
			await gameService.updateRoom(room.id, { exploration_data: JSON.stringify(newExploration) });
			onExplorationStart(room.id, assignedCrewIds);
			setSelectedCrew([]);
			onClose();
		} catch (error) {
			console.error('Failed to start exploration:', error);
		}
	};

	const calculateTimeRemaining = (room: RoomTemplate, crewCount: number): number => {
		const baseTime = room.base_exploration_time || 2;
		const crewMultiplier = Math.max(0.5, 1 / Math.max(1, crewCount));
		const explorationData = JSON.parse(room.exploration_data || '{}');
		const pctTimeRemaining = 100 - (explorationData.progress || 0);
		return (baseTime * crewMultiplier) * (pctTimeRemaining / 100);
	};

	const cancelExploration = async (room: RoomTemplate) => {
		if (!room.exploration_data) return;
		try {
			const explorationData = JSON.parse(room.exploration_data);
			const crewIds = explorationData.crewAssigned || explorationData.crew_assigned || [];

			for (const crewId of crewIds) {
				await gameService.assignCrewToRoom(crewId, null);
			}
			await gameService.clearExplorationProgress(room.id);
			onClose();
		} catch (error) {
			console.error('Failed to cancel exploration:', error);
		}
	};

	const availableCrewMembers = availableCrew || [];
	const assignedCrewMembers = (assignedCrew || []).filter((crew) => {
		if (!selectedRoom?.exploration_data) return false;
		try {
			const explorationData = JSON.parse(selectedRoom.exploration_data);
			const crewAssigned = explorationData.crewAssigned || explorationData.crew_assigned || [];
			return crewAssigned.includes(crew.id);
		} catch {
			return false;
		}
	});

	// Early return if modal is not supposed to be shown
	if (!showModal) {
		return null;
	}

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
							{isManagingExploration && explorationData ? (
								// Ongoing exploration management
								<div>
									<RoomExplorationProgress roomId={selectedRoom.id} />

									<p>Manage crew assignments below. Changing crew will recalculate completion time.</p>

									{selectedCrew.length > 0 && (
										<Alert variant="warning" className="mb-3">
											<strong>New estimated time:</strong> {calculateTimeRemaining(
												selectedRoom as any,
												selectedCrew.length,
											)?.toFixed(1)} hours
											{selectedCrew.length !== explorationData.crew_assigned.length && (
												<div className="mt-1">
													<small>
														{selectedCrew.length > explorationData.crew_assigned.length
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
											<strong>Estimated time:</strong> {calculateTimeRemaining(
												selectedRoom as any,
												selectedCrew.length,
											)?.toFixed(1)} hours
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
													{crew.name}
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
									No crew members are currently available.
									All crew are assigned to rooms or exploring.
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
											{crew.name}
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
													{crew.name}
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
								onClick={() => selectedRoom && cancelExploration(selectedRoom as any)}
								disabled={gameStatePaused}
							>
								Cancel Exploration
							</Button>
							<Button
								variant="primary"
								onClick={() => selectedRoom && updateExplorationCrew(selectedRoom as any, selectedCrew)}
								disabled={gameStatePaused || selectedCrew.length === 0}
							>
								Update Crew ({selectedCrew.length} assigned)
							</Button>
						</>
					) : (
						// Button for starting new exploration
						<Button
							variant="primary"
							onClick={() => selectedRoom && startExploration(selectedRoom as any, selectedCrew)}
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
