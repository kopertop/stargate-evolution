import React, { useState } from 'react';

import type { DestinyStatus } from '../types';

import { ShipMap } from './ship-map';

interface ShipViewProps {
	destinyStatus: DestinyStatus;
	onStatusUpdate: (newStatus: DestinyStatus) => void;
	onNavigateToGalaxy: () => void;
	gameId?: string;
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
	gameId,
}) => {
	const [gameIsPaused, setGameIsPaused] = useState(true);
	const [lastTimeRemaining, setLastTimeRemaining] = useState(destinyStatus.nextFtlTransition);

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
			advanceTime(timeDelta);
		}
	};

	// Advance game time and handle resource consumption
	const advanceTime = (hours: number) => {
		let newGameDays = destinyStatus.gameDays;
		let newGameHours = destinyStatus.gameHours + hours;
		let newFtlStatus = destinyStatus.ftlStatus;
		let newNextFtlTransition = destinyStatus.nextFtlTransition - hours;

		// Handle day rollover
		while (newGameHours >= 24) {
			newGameHours -= 24;
			newGameDays += 1;
		}

		// Handle FTL transitions
		if (newNextFtlTransition <= 0) {
			if (newFtlStatus === 'ftl') {
				newFtlStatus = 'normal_space';
				newNextFtlTransition = 6 + Math.random() * 12; // 6-18 hours in normal space
			} else {
				newFtlStatus = 'ftl';
				newNextFtlTransition = 24 + Math.random() * 48; // 1-3 days in FTL
			}
		}

		// Daily resource consumption (during day rollover)
		const newInventory = { ...destinyStatus.inventory };
		const daysAdvanced = newGameDays - destinyStatus.gameDays;
		if (daysAdvanced > 0) {
			newInventory.food = Math.max(0, (newInventory.food || 0) - (dailyFoodConsumption * daysAdvanced));
			newInventory.water = Math.max(0, (newInventory.water || 0) - (dailyWaterConsumption * daysAdvanced));
		}

		// Handle atmospheric systems
		const newAtmosphere = { ...destinyStatus.atmosphere };
		newAtmosphere.o2 -= (hourlyO2Consumption * hours) / 1000; // Convert to percentage
		newAtmosphere.co2 += (hourlyCO2Generation * hours) / 1000;

		// CO2 scrubbers work if operational
		if (newAtmosphere.co2Scrubbers > 0) {
			const scrubberEfficiency = newAtmosphere.co2Scrubbers * 25 * hours / 1000;
			newAtmosphere.co2 = Math.max(0, newAtmosphere.co2 - scrubberEfficiency);
			newAtmosphere.o2 = Math.min(21, newAtmosphere.o2 + scrubberEfficiency * 0.8);
		}

		// Clamp values
		newAtmosphere.o2 = Math.max(0, Math.min(21, newAtmosphere.o2));
		newAtmosphere.co2 = Math.max(0, Math.min(10, newAtmosphere.co2));

		// Update destiny status with new time and resources
		onStatusUpdate({
			...destinyStatus,
			gameDays: newGameDays,
			gameHours: newGameHours,
			ftlStatus: newFtlStatus as 'ftl' | 'normal_space',
			nextFtlTransition: Math.max(0, newNextFtlTransition),
			inventory: newInventory,
			atmosphere: newAtmosphere,
		});
	};

	return (
		<div className="ship-view" style={{ width: '100%', height: '100%' }}>
			{/* Interactive Ship Map - Full Screen */}
			<ShipMap gameId={gameId || ''} />
		</div>
	);
};
