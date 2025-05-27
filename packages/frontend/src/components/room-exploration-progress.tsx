import { displayTimeRemaining } from '@stargate/common';
import database, { Room } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Alert, ProgressBar } from 'react-bootstrap';
import { FaClock } from 'react-icons/fa';


import { ExplorationProgress } from '../types/model-types';


interface RoomExplorationProgressProps {
	roomId: string;
}

export const RoomExplorationProgress: React.FC<RoomExplorationProgressProps> = ({
	roomId,
}) => {
	console.log('roomId', roomId);
	const [progress, setProgress] = useState<number>(0);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);

	useEffect(() => {
		if (roomId) {
			console.log('** roomId', roomId);
			const subscription = database.get<Room>('rooms').findAndObserve(roomId).subscribe((room) => {
				console.log('** room', room);
				if (room?.explorationData) {
					const explorationData = JSON.parse(room.explorationData) as ExplorationProgress;
					console.log('** explorationData', explorationData);
					setProgress(explorationData.progress);
					setTimeRemaining(explorationData.timeRemaining);
				}
			});
			return () => subscription.unsubscribe();
		}
	}, [roomId]);


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
