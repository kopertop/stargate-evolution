import { useQuery } from '@livestore/react';
import type { DestinyStatus } from '@stargate/common/models/destiny-status';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

import { useGameService } from '../services/use-game-service';

import { useGameState } from './game-state-context';

interface DestinyStatusContextType {
	destinyStatus: DestinyStatus;
	timeUntilNextTransition: number; // Hours until next FTL transition
	isInFTL: boolean;
	triggerFTLTransition: () => Promise<void>;
}

const DestinyStatusContext = createContext<DestinyStatusContextType | undefined>(undefined);

interface DestinyStatusProviderProps {
	children: ReactNode;
}

export const DestinyStatusProvider: React.FC<DestinyStatusProviderProps> = ({ children }) => {
	const { gameTime, game } = useGameState();
	const [timeUntilNextTransition, setTimeUntilNextTransition] = useState<number>(0);

	const gameService = useGameService();

	// Query destiny status using LiveStore
	const destinyStatus = useQuery(gameService.queries.destinyStatus(game.id))[0];

	// Load initial Destiny status
	useEffect(() => {
		if (!destinyStatus) return;

		if ((destinyStatus.next_ftl_transition - gameTime) < 0) {
			triggerFTLTransition();
			setTimeUntilNextTransition(0);
		} else {
			setTimeUntilNextTransition(destinyStatus.next_ftl_transition - gameTime);
		}
	}, [destinyStatus, gameTime]);

	const triggerFTLTransition = async () => {
		if (!destinyStatus) return;

		const newFtlStatus = destinyStatus.ftl_status === 'ftl' ? 'normal_space' : 'ftl';
		let transitionTime = 0;

		if (newFtlStatus === 'normal_space') {
			// Dropping out of FTL
			transitionTime = 6 + Math.random() * 24; // 6-30 hours in normal space
		} else {
			// Entering FTL
			transitionTime = 24 + Math.random() * 48; // 1-3 days in FTL
		}
		const newNextFtlTransition = gameTime + (transitionTime * 3600);

		await gameService.updateDestinyStatus(game.id, {
			ftl_status: newFtlStatus,
			next_ftl_transition: newNextFtlTransition,
		});
	};

	const isInFTL = destinyStatus?.ftl_status === 'ftl';

	const value: DestinyStatusContextType = {
		destinyStatus,
		timeUntilNextTransition,
		isInFTL,
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
