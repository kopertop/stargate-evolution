import { displayTimeRemaining } from '@stargate/common';
import type { Room } from '@stargate/db';
import React, { useState, useEffect } from 'react';
import { Alert, ProgressBar } from 'react-bootstrap';
import { FaClock } from 'react-icons/fa';

import { dbPromise } from '../db';
import { ExplorationProgress } from '../types/model-types';

interface RoomExplorationProgressProps {
	roomId: string;
}

export const RoomExplorationProgress: React.FC<RoomExplorationProgressProps> = ({
	roomId,
}) => {
	const [progress, setProgress] = useState<number>(0);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [baseExplorationTime, setBaseExplorationTime] = useState<number>(2);

	useEffect(() => {
		let unsub: (() => void) | undefined;
		if (roomId) {
			(async () => {
				const db = await dbPromise;
				const room = await db.get('rooms').find(roomId);
				if (room) {
					setBaseExplorationTime(room.baseExplorationTime ?? 2);
					if (room.explorationData) {
						const explorationData = typeof room.explorationData === 'string' ? JSON.parse(room.explorationData) : room.explorationData;
						setProgress(explorationData.progress);
						setTimeRemaining(explorationData.timeRemaining);
					}
				}
			})();
		}
		return () => {
			if (unsub) unsub();
		};
	}, [roomId]);

	return (
		<Alert variant='info' className='mb-3'>
			<div className='d-flex align-items-center mb-2'>
				<FaClock className='me-2' />
				<strong>Exploration in Progress</strong>
			</div>
			<ProgressBar
				now={progress}
				label={`${Math.round(progress)}%`}
				className='mb-2'
			/>
			<div className='d-flex justify-content-between'>
				<span>Time Remaining: <strong>{displayTimeRemaining(timeRemaining)}</strong></span>
				<span>Base Time: <strong>{baseExplorationTime} hours</strong></span>
				<span>Progress: <strong>{Math.round(progress)}%</strong></span>
			</div>
		</Alert>
	);
};
