import { useQuery } from '@livestore/react';
import { PersonTemplate } from '@stargate/common';
import React, { useState } from 'react';
import { Nav, ProgressBar } from 'react-bootstrap';
import type { IconType } from 'react-icons';
import { GiMeeple, GiCog, GiHammerNails, GiMedicalPack, GiMagnifyingGlass } from 'react-icons/gi';

import { useGameService } from '../services/game-service';

interface CrewStatusProps {
	game_id: string;
}

interface CrewMemberWithTask extends Omit<PersonTemplate, 'skills'> {
	skills: string[];
	assigned_to?: string;
	currentTask?: {
		type: 'exploration' | 'repair' | 'research' | 'medical' | 'idle';
		roomId?: string;
		roomName?: string;
		progress?: number; // 0-100
		timeRemaining?: number; // in hours
		description?: string;
	};
}

// Simple wrapper to fix React Icons TypeScript issues
const Icon: React.FC<{ icon: IconType; size?: number; className?: string }> = ({
	icon: IconComponent,
	size = 16,
	className = '',
}) => {
	return <IconComponent size={size} className={className} />;
};

export const CrewStatus: React.FC<CrewStatusProps> = ({ game_id }) => {
	const [showCrewDetails, setShowCrewDetails] = useState(false);
	const [crewHoverTimeout, setCrewHoverTimeout] = useState<NodeJS.Timeout | null>(null);

	const gameService = useGameService();
	const peopleArr = useQuery(game_id ? gameService.queries.peopleByGame(game_id) : gameService.queries.peopleByGame('')) || [];
	const roomsArr = useQuery(game_id ? gameService.queries.roomsByGame(game_id) : gameService.queries.roomsByGame('')) || [];

	function enrichCrewMemberWithTask(crewMember: any): CrewMemberWithTask {
		if (!crewMember.assigned_to) {
			return {
				...crewMember,
				currentTask: {
					type: 'idle',
					description: 'Available for assignment',
				},
			};
		}
		const assignedRoom = roomsArr.find((room) => room.id === crewMember.assigned_to);
		if (!assignedRoom) {
			return {
				...crewMember,
				currentTask: {
					type: 'idle',
					description: 'Assignment unclear',
				},
			};
		}
		if (assignedRoom.exploration_data) {
			try {
				const explorationData = JSON.parse(assignedRoom.exploration_data) as any;
				const crewAssigned = explorationData.crewAssigned || explorationData.crew_assigned || [];
				if (crewAssigned.includes(crewMember.id)) {
					const progress = explorationData.progress || 0;
					const timeRemaining = explorationData.time_remaining || explorationData.timeRemaining || 0;
					return {
						...crewMember,
						currentTask: {
							type: 'exploration',
							roomId: assignedRoom.id,
							roomName: assignedRoom.type,
							progress,
							timeRemaining,
							description: `Exploring ${assignedRoom.type}`,
						},
					};
				}
			} catch (error) {
				console.error('Error parsing exploration data:', error);
			}
		}
		return {
			...crewMember,
			currentTask: {
				type: 'repair',
				roomId: assignedRoom.id,
				roomName: assignedRoom.type,
				description: `Working in ${assignedRoom.type}`,
			},
		};
	}

	const crewMembers: CrewMemberWithTask[] = peopleArr.map((person) => {
		return {
			...person,
			skills: Array.isArray(person.skills) ? person.skills : (typeof person.skills === 'string' ? (() => { try { return JSON.parse(person.skills); } catch { return []; } })() : []),
		};
	}).map(enrichCrewMemberWithTask);



	const handleCrewMouseEnter = () => {
		if (crewHoverTimeout) {
			clearTimeout(crewHoverTimeout);
			setCrewHoverTimeout(null);
		}
		setShowCrewDetails(true);
	};

	const handleCrewMouseLeave = () => {
		const timeout = setTimeout(() => {
			setShowCrewDetails(false);
		}, 150);
		setCrewHoverTimeout(timeout);
	};

	const toggleCrewDetails = () => {
		setShowCrewDetails(!showCrewDetails);
	};

	const getTaskIcon = (taskType: string): IconType => {
		switch (taskType) {
		case 'exploration':
			return GiMagnifyingGlass;
		case 'repair':
			return GiHammerNails;
		case 'medical':
			return GiMedicalPack;
		case 'research':
			return GiCog;
		default:
			return GiMeeple;
		}
	};

	const getTaskColor = (taskType: string): string => {
		switch (taskType) {
		case 'exploration':
			return 'text-info';
		case 'repair':
			return 'text-warning';
		case 'medical':
			return 'text-success';
		case 'research':
			return 'text-primary';
		default:
			return 'text-muted';
		}
	};

	const formatTimeRemaining = (hours: number): string => {
		if (hours < 1) {
			const minutes = Math.round(hours * 60);
			return `${minutes}m`;
		}
		return `${hours.toFixed(1)}h`;
	};

	// Calculate unassigned vs total crew
	const unassignedCrew = crewMembers.filter(c => c.currentTask?.type === 'idle').length;
	const totalCrew = crewMembers.length;

	return (
		<Nav.Item className="d-flex align-items-center me-3 position-relative">
			<span
				title="Crew: Unassigned/Total (click for details)"
				className="d-flex align-items-center"
				style={{ cursor: 'pointer' }}
				onClick={toggleCrewDetails}
				onMouseEnter={handleCrewMouseEnter}
				onMouseLeave={handleCrewMouseLeave}
			>
				<Icon icon={GiMeeple} />
				<span title="Unassigned/Total Crew">
					{unassignedCrew}/{totalCrew}
				</span>
			</span>

			{/* Crew Details Popup */}
			{showCrewDetails && (
				<div
					className="position-absolute bottom-100 end-0 mb-2 p-3 rounded shadow-lg"
					style={{
						background: 'rgba(18,20,32,0.98)',
						border: '1px solid #333',
						minWidth: '400px',
						maxWidth: '500px',
						fontSize: '0.9rem',
						zIndex: 10000,
						maxHeight: '400px',
						overflowY: 'auto',
					}}
					onMouseEnter={handleCrewMouseEnter}
					onMouseLeave={handleCrewMouseLeave}
				>
					<strong className="d-flex align-items-center mb-3">
						<Icon icon={GiMeeple} />
						Crew Manifest ({crewMembers.length})
					</strong>

					<div className="ms-2">
						{crewMembers.length > 0 ? (
							crewMembers.map((crewMember) => (
								<div key={crewMember.id} className="mb-3 pb-2" style={{ borderBottom: '1px solid #444' }}>
									<div className="d-flex justify-content-between align-items-start">
										<div className="flex-grow-1">
											<div className="d-flex align-items-center mb-1">
												<strong className="me-2">{crewMember.name}</strong>
												<small className="text-muted">({crewMember.role.replace('_', ' ')})</small>
											</div>

											{crewMember.currentTask && (
												<div className="d-flex align-items-center mb-1">
													<Icon
														icon={getTaskIcon(crewMember.currentTask.type)}
														size={14}
														className={getTaskColor(crewMember.currentTask.type)}
													/>
													<span className="ms-1 small">
														{crewMember.currentTask.description}
													</span>
												</div>
											)}

											{/* Progress bar for tasks with time remaining */}
											{crewMember.currentTask?.progress !== undefined && crewMember.currentTask?.timeRemaining !== undefined && (
												<div className="mt-1">
													<div className="d-flex justify-content-between align-items-center mb-1">
														<small className="text-muted">Progress:</small>
														<small className="text-muted">
															{formatTimeRemaining(crewMember.currentTask.timeRemaining)} remaining
														</small>
													</div>
													<ProgressBar
														now={crewMember.currentTask.progress}
														style={{ height: '8px' }}
														variant={crewMember.currentTask.progress > 75 ? 'success' : crewMember.currentTask.progress > 25 ? 'info' : 'warning'}
													/>
												</div>
											)}

											{/* Skills display */}
											<div className="mt-1">
												<small className="text-muted">Skills: </small>
												<small>
													{crewMember.skills.slice(0, 3).map((skill, index) => (
														<span key={skill} className="text-info">
															{skill.replace('_', ' ')}
															{index < Math.min(crewMember.skills.length, 3) - 1 ? ', ' : ''}
														</span>
													))}
													{crewMember.skills.length > 3 && (
														<span className="text-muted"> +{crewMember.skills.length - 3} more</span>
													)}
												</small>
											</div>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="text-muted">No crew members found</div>
						)}
					</div>

					{/* Summary footer */}
					<div className="mt-3 pt-2" style={{ borderTop: '1px solid #444' }}>
						<div className="row text-center">
							<div className="col-3">
								<small className="text-success">
									{crewMembers.filter(c => c.currentTask?.type === 'idle').length} Available
								</small>
							</div>
							<div className="col-3">
								<small className="text-info">
									{crewMembers.filter(c => c.currentTask?.type === 'exploration').length} Exploring
								</small>
							</div>
							<div className="col-3">
								<small className="text-warning">
									{crewMembers.filter(c => c.currentTask?.type === 'repair').length} Working
								</small>
							</div>
							<div className="col-3">
								<small className="text-primary">
									{crewMembers.filter(c => c.currentTask?.type === 'research').length} Research
								</small>
							</div>
						</div>
					</div>
				</div>
			)}
		</Nav.Item>
	);
};
