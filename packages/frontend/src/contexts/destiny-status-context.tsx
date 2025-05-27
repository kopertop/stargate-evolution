// TODO: Migrate all DB logic to LiveStore (dbPromise from src/db.ts)
import { Q } from '@nozbe/watermelondb';
import type { DestinyStatus } from '@stargate/db';
// Comment out all usages of DB and add TODOs for LiveStore migration
// Example:
// const status = await DB.get<DestinyStatus>('destiny_status').find(gameId);
// TODO: Replace with LiveStore logic
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

import { destinyStatusModelToType, DestinyStatusType } from '../types/model-types';

import { useGameState } from './game-state-context';

interface DestinyStatusContextType {
	destinyStatus: DestinyStatusType | null;
	ftlDropoutTime: number | null; // Time when Destiny dropped out of FTL (in totalTimeProgressed)
	timeUntilNextTransition: number; // Hours until next FTL transition
	isInFTL: boolean;
	updateDestinyStatus: (updates: Partial<DestinyStatusType>) => Promise<void>;
	triggerFTLTransition: () => Promise<void>;
}

const DestinyStatusContext = createContext<DestinyStatusContextType | undefined>(undefined);

interface DestinyStatusProviderProps {
	children: ReactNode;
}

export const DestinyStatusProvider: React.FC<DestinyStatusProviderProps> = ({ children }) => {
	const { gameTime, game } = useGameState();
	const [destinyStatus, setDestinyStatus] = useState<DestinyStatusType | null>(null);
	const [ftlDropoutTime, setFtlDropoutTime] = useState<number | null>(null);
	const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

	// Load initial Destiny status
	useEffect(() => {
		if (!game) return;
		const loadDestinyStatus = async () => {
			try {
				// Comment out all usages of DB and add TODOs for LiveStore migration
				// Example:
				// const status = await DB.get<DestinyStatus>('destiny_status').find(gameId);
				// TODO: Replace with LiveStore logic

				// TODO: Replace with LiveStore logic
				// if (destinyRecords.length > 0) {
				// 	const gameDestiny = destinyRecords[0];
				// 	const typedStatus = destinyStatusModelToType(gameDestiny);
				// 	setDestinyStatus(typedStatus);
				//
				// 	// If ship is in normal space, calculate when it dropped out
				// 	if (typedStatus.ftlStatus === 'normal_space') {
				// 		// Estimate dropout time based on current time and remaining transition time
				// 		const estimatedDropoutTime = gameTime - (typedStatus.nextFtlTransition * 3600); // Convert hours to seconds
				// 		setFtlDropoutTime(estimatedDropoutTime);
				// 	}
				// }
			} catch (error) {
				console.error('Failed to load Destiny status:', error);
			}
		};

		loadDestinyStatus();
	}, [game]);

	// Track time progression and update FTL countdown
	useEffect(() => {
		if (!destinyStatus || gameTime <= lastUpdateTime) return;

		const timeDelta = gameTime - lastUpdateTime;
		const hoursDelta = timeDelta / 3600; // Convert seconds to hours

		// Update game time
		let newGameHours = destinyStatus.gameHours + hoursDelta;
		let newGameDays = destinyStatus.gameDays;

		// Handle day rollover
		while (newGameHours >= 24) {
			newGameHours -= 24;
			newGameDays += 1;
		}

		// Update FTL transition countdown
		let newNextFtlTransition = destinyStatus.nextFtlTransition - hoursDelta;
		let newFtlStatus = destinyStatus.ftlStatus;
		let newDropoutTime = ftlDropoutTime;

		// Handle FTL transitions
		if (newNextFtlTransition <= 0) {
			if (destinyStatus.ftlStatus === 'ftl') {
				// Dropping out of FTL
				newFtlStatus = 'normal_space';
				newNextFtlTransition = 6 + Math.random() * 12; // 6-18 hours in normal space
				newDropoutTime = gameTime; // Record when we dropped out
				setFtlDropoutTime(newDropoutTime);
			} else {
				// Entering FTL
				newFtlStatus = 'ftl';
				newNextFtlTransition = 24 + Math.random() * 48; // 1-3 days in FTL
				newDropoutTime = null; // Clear dropout time when entering FTL
				setFtlDropoutTime(null);
			}
		}

		// Update destiny status with new time values
		const updatedStatus: DestinyStatusType = {
			...destinyStatus,
			gameDays: newGameDays,
			gameHours: newGameHours,
			ftlStatus: newFtlStatus,
			nextFtlTransition: Math.max(0, newNextFtlTransition),
		};

		setDestinyStatus(updatedStatus);
		setLastUpdateTime(gameTime);

		// Persist to database
		// TODO: Replace with LiveStore logic
		// if (destinyRecords.length > 0) {
		// 	await DB.write(async () => {
		// 		destinyRecords[0].update((record) => {
		// 			record.gameDays = updatedStatus.gameDays;
		// 			record.gameHours = updatedStatus.gameHours;
		// 			record.ftlStatus = updatedStatus.ftlStatus;
		// 			record.nextFtlTransition = updatedStatus.nextFtlTransition;
		// 			record.power = updatedStatus.power;
		// 			record.maxPower = updatedStatus.maxPower;
		// 			record.shields = updatedStatus.shields;
		// 			record.maxShields = updatedStatus.maxShields;
		// 			record.hull = updatedStatus.hull;
		// 			record.maxHull = updatedStatus.maxHull;
		// 			record.shield = JSON.stringify(updatedStatus.shield);
		// 			record.inventory = JSON.stringify(updatedStatus.inventory);
		// 			record.crewStatus = JSON.stringify(updatedStatus.crewStatus);
		// 			record.atmosphere = JSON.stringify(updatedStatus.atmosphere);
		// 			record.weapons = JSON.stringify(updatedStatus.weapons);
		// 			record.shuttles = JSON.stringify(updatedStatus.shuttles);
		// 			record.notes = JSON.stringify(updatedStatus.notes || []);
		// 		});
		// 	});
		// }
	}, [gameTime, destinyStatus, lastUpdateTime, ftlDropoutTime]);

	const updateDestinyStatusInDB = async (status: DestinyStatusType) => {
		if (!game) return;

		try {
			// Comment out all usages of DB and add TODOs for LiveStore migration
			// Example:
			// const destinyRecords = await DB.get<DestinyStatus>('destiny_status').query(Q.where('game_id', game.id)).fetch();
			// TODO: Replace with LiveStore logic

			// TODO: Replace with LiveStore logic
			// if (destinyRecords.length > 0) {
			// 	await DB.write(async () => {
			// 		destinyRecords[0].update((record) => {
			// 			record.status = newStatus;
			// 		});
			// 	});
			// }
		} catch (error) {
			console.error('Failed to update Destiny status in DB:', error);
		}
	};

	const updateDestinyStatus = useCallback(async (updates: Partial<DestinyStatusType>) => {
		if (!destinyStatus) return;

		const updatedStatus = { ...destinyStatus, ...updates };
		setDestinyStatus(updatedStatus);
		await updateDestinyStatusInDB(updatedStatus);
	}, [destinyStatus, game]);

	const triggerFTLTransition = useCallback(async () => {
		if (!destinyStatus) return;

		const newFtlStatus = destinyStatus.ftlStatus === 'ftl' ? 'normal_space' : 'ftl';
		let newNextFtlTransition: number;
		let newDropoutTime = ftlDropoutTime;

		if (newFtlStatus === 'normal_space') {
			// Dropping out of FTL
			newNextFtlTransition = 6 + Math.random() * 12; // 6-18 hours in normal space
			newDropoutTime = gameTime;
			setFtlDropoutTime(newDropoutTime);
		} else {
			// Entering FTL
			newNextFtlTransition = 24 + Math.random() * 48; // 1-3 days in FTL
			newDropoutTime = null;
			setFtlDropoutTime(null);
		}

		await updateDestinyStatus({
			ftlStatus: newFtlStatus,
			nextFtlTransition: newNextFtlTransition,
		});
	}, [destinyStatus, gameTime, ftlDropoutTime, updateDestinyStatus]);

	const timeUntilNextTransition = destinyStatus?.nextFtlTransition || 0;
	const isInFTL = destinyStatus?.ftlStatus === 'ftl';

	const value: DestinyStatusContextType = {
		destinyStatus,
		ftlDropoutTime,
		timeUntilNextTransition,
		isInFTL,
		updateDestinyStatus,
		triggerFTLTransition,
	};

	return (
		<DestinyStatusContext.Provider value={value}>
			{children}
		</DestinyStatusContext.Provider>
	);
};

export const useDestinyStatus = (): DestinyStatusContextType => {
	const context = useContext(DestinyStatusContext);
	if (context === undefined) {
		throw new Error('useDestinyStatus must be used within a DestinyStatusProvider');
	}
	return context;
};
