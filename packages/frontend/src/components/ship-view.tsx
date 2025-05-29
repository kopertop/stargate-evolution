import { useQuery } from '@livestore/react';
import React, { useState } from 'react';

import { useGameService } from '../services/use-game-service';
import type { DestinyStatus } from '../types';

import { ShipMap } from './ship-map';

interface ShipViewProps {
	destinyStatus: DestinyStatus;
	onStatusUpdate: (newStatus: DestinyStatus) => void;
	onNavigateToGalaxy: () => void;
	game_id?: string;
}

// Resource consumption rates (per crew member per day)
const RESOURCE_CONSUMPTION = {
	food: 1,
	water: 2,
	oxygen: 24, // per hour
	co2_generation: 20, // per hour
};

export const ShipView: React.FC<ShipViewProps> = ({
	destinyStatus,
	onStatusUpdate,
	onNavigateToGalaxy,
	game_id,
}) => {
	const [gameIsPaused, setGameIsPaused] = useState(true);
	const [lastTimeRemaining, setLastTimeRemaining] = useState(destinyStatus.nextFtlTransition);

	const gameService = useGameService();
	const inventoryArr = useQuery(game_id ? gameService.queries.inventoryByGame(game_id) : gameService.queries.inventoryByGame('')) || [];
	const inventoryMap = Object.fromEntries(inventoryArr.map((i: any) => [i.resourceType, i.amount]));

	// Calculate daily resource consumption
	const crewCount = destinyStatus.crewStatus.onboard;
	const dailyFoodConsumption = crewCount * RESOURCE_CONSUMPTION.food;
	const dailyWaterConsumption = crewCount * RESOURCE_CONSUMPTION.water;
	const hourlyO2Consumption = crewCount * RESOURCE_CONSUMPTION.oxygen;
	const hourlyCO2Generation = crewCount * RESOURCE_CONSUMPTION.co2_generation;

	// Get game time from destiny status
	const gameTime = {
		days: destinyStatus.gameDays,
		hours: destinyStatus.gameHours,
		ftlStatus: destinyStatus.ftlStatus as 'ftl' | 'normal_space',
		nextDropOut: destinyStatus.nextFtlTransition,
	};

	// Handle real-time countdown updates from the clock
	const handleCountdownUpdate = (newTimeRemaining: number) => {
		// Check if game is paused by seeing if time is advancing
		const timeDelta = lastTimeRemaining - newTimeRemaining;
		setGameIsPaused(timeDelta <= 0.001); // Allow for small floating point errors
		setLastTimeRemaining(newTimeRemaining);

		// Calculate how much time has passed
		if (timeDelta > 0) {
			// TODO: Resource consumption should be handled via LiveStore events, not local mutation
			// advanceTime(timeDelta);
		}
	};

	return (
		<div className="ship-view" style={{ width: '100%', height: '100%' }}>
			{/* Interactive Ship Map - Full Screen */}
			<ShipMap game_id={game_id || ''} />
		</div>
	);
};
