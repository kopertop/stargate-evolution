import { create } from 'zustand';
import { GamePlanet } from '../types';

interface GameState {
	currentPlanet: GamePlanet | null;
	currentLocation: string;
	isInWormhole: boolean;
	changeLocation: (planet: GamePlanet, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
	currentPlanet: null,
	currentLocation: '',
	isInWormhole: false,

	changeLocation: (planet, location) => set({
		currentPlanet: planet,
		currentLocation: location,
		isInWormhole: false,
	}),

	setIsInWormhole: (isInWormhole) => set({ isInWormhole }),
}));
