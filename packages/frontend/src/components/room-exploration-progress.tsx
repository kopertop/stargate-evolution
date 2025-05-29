import { useQuery } from '@livestore/react';
import { displayTimeRemaining } from '@stargate/common';
import React from 'react';
import { Alert, ProgressBar } from 'react-bootstrap';
import { FaClock } from 'react-icons/fa';

import { useGameService } from '../services/use-game-service';
import { ExplorationProgress, roomDataToType } from '../types/model-types';

interface RoomExplorationProgressProps {
	roomId: string;
}

export const RoomExplorationProgress: React.FC<RoomExplorationProgressProps> = ({
	roomId,
}) => {
	const gameService = useGameService();
	const roomArr = useQuery(roomId ? gameService.queries.roomById(roomId) : gameService.queries.roomById('')) || [];
	const room = roomArr[0] ? roomDataToType(roomArr[0]) : undefined;

	let progress = 0;
	let timeRemaining = 0;
	if (room && room.explorationData) {
		try {
			const explorationData = typeof room.explorationData === 'string' ? JSON.parse(room.explorationData) as ExplorationProgress : room.explorationData;
			progress = explorationData.progress;
			timeRemaining = explorationData.timeRemaining;
		} catch {
			progress = 0;
			timeRemaining = 0;
		}
	}

	return (
		<Alert variant="info" className="mb-3">
			<div className="d-flex align-items-center mb-2">
				<FaClock className="me-2" />
				<strong>Exploration in Progress</strong>
			</div>
			<ProgressBar
				now={progress}
				label={`${Math.round(progress)}%`}
				className="mb-2"
			/>
			<div className="d-flex justify-content-between">
				<span>Time Remaining: <strong>{displayTimeRemaining(timeRemaining)}</strong></span>
				<span>Progress: <strong>{Math.round(progress)}%</strong></span>
			</div>
		</Alert>
	);
};
