import { create } from 'zustand';
import { Planets } from '../../types';

export interface GameState {
	currentPlanet: Planets;
	currentLocation: string;
	isInWormhole: boolean;
	changeLocation: (planet: Planets, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
	currentPlanet: 'Earth',
	currentLocation: 'Stargate Command',
	isInWormhole: false,
	changeLocation: (planet, location) =>
		set(() => ({
			currentPlanet: planet,
			currentLocation: location,
		})),
	setIsInWormhole: (isInWormhole) =>
		set(() => ({
			isInWormhole,
		})),
}));
