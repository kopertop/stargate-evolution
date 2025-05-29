import { useQuery } from '@livestore/react';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

import { useGameService } from '../services/use-game-service';
import { destinyStatusDataToType, DestinyStatusType } from '../types/model-types';

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

	const gameService = useGameService();

	// Query destiny status using LiveStore
	const destinyQuery = useQuery(game?.id ? gameService.queries.destinyStatus(game.id) : gameService.queries.destinyStatus(''));
	const destinyRecord = destinyQuery?.[0];

	// Load initial Destiny status
	useEffect(() => {
		if (!destinyRecord) return;

		try {
			// Convert LiveStore data to DestinyStatusType format
			const typedStatus = destinyStatusDataToType(destinyRecord);

			setDestinyStatus(typedStatus);

			// If ship is in normal space, calculate when it dropped out
			if (typedStatus.ftlStatus === 'normal_space') {
				// Estimate dropout time based on current time and remaining transition time
				const estimatedDropoutTime = gameTime - (typedStatus.nextFtlTransition * 3600); // Convert hours to seconds
				setFtlDropoutTime(estimatedDropoutTime);
			}
		} catch (error) {
			console.error('Failed to load Destiny status:', error);
		}
	}, [destinyRecord, gameTime]);

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

		// Persist using LiveStore
		updateDestinyStatusInStore(updatedStatus);
	}, [gameTime, destinyStatus, lastUpdateTime, ftlDropoutTime]);

	const updateDestinyStatusInStore = async (status: DestinyStatusType) => {
		if (!game?.id) return;

		try {
			gameService.updateDestinyStatus(game.id, {
				power: status.power,
				shields: status.shields,
				hull: status.hull,
				gameDays: status.gameDays,
				gameHours: status.gameHours,
				ftlStatus: status.ftlStatus,
			});
		} catch (error) {
			console.error('Failed to update Destiny status in store:', error);
		}
	};

	const updateDestinyStatus = useCallback(async (updates: Partial<DestinyStatusType>) => {
		if (!destinyStatus) return;

		const updatedStatus = { ...destinyStatus, ...updates };
		setDestinyStatus(updatedStatus);
		await updateDestinyStatusInStore(updatedStatus);
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
