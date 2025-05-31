import { useQuery } from '@livestore/react';
import { DestinyStatus } from '@stargate/common';
import React, { useMemo, useState } from 'react';

import { useGameService } from '../services/use-game-service';

import { ShipMap } from './ship-map';
import { SpaceBackground } from './space-background';

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
	const [lastTimeRemaining, setLastTimeRemaining] = useState(destinyStatus.next_ftl_transition);

	const gameService = useGameService();
	const inventoryArr = useQuery(game_id ? gameService.queries.inventoryByGame(game_id) : gameService.queries.inventoryByGame('')) || [];
	const crewMembers = useQuery(game_id ? gameService.queries.crewMembers(game_id) : gameService.queries.crewMembers('')) || [];
	const crewCount = useMemo(() => crewMembers.length, [crewMembers]);

	const inventoryMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const item of inventoryArr) {
			map.set(item.resource_type, item.amount);
		}
		return map;
	}, [inventoryArr]);

	// Calculate daily resource consumption
	const dailyFoodConsumption = useMemo(() => crewCount * RESOURCE_CONSUMPTION.food, [crewCount]);
	const dailyWaterConsumption = useMemo(() => crewCount * RESOURCE_CONSUMPTION.water, [crewCount]);
	const hourlyO2Consumption = useMemo(() => crewCount * RESOURCE_CONSUMPTION.oxygen, [crewCount]);
	const hourlyCO2Generation = useMemo(() => crewCount * RESOURCE_CONSUMPTION.co2_generation, [crewCount]);

	// Get game time from destiny status
	const gameTime = useMemo(() => ({
		days: destinyStatus.game_days,
		hours: destinyStatus.game_hours,
		ftlStatus: destinyStatus.ftl_status as 'ftl' | 'normal_space',
		nextDropOut: destinyStatus.next_ftl_transition,
	}), [destinyStatus]);

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
		<div className="ship-view" style={{ position: 'relative', width: '100%', height: '100%' }}>
			<SpaceBackground
				mode={destinyStatus.ftl_status === 'ftl' ? 'ftl' : destinyStatus.location ? 'system' : 'empty'}
				systemId={destinyStatus.location}
			/>
			{/* Interactive Ship Map - Full Screen */}
			<ShipMap game_id={game_id || ''} />
		</div>
	);
};
