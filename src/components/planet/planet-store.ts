import { create } from 'zustand';
import { GamePlanet, Planets } from '../../types';

interface PlanetState {
	currentPlanet: Planets;
	planets: Record<string, GamePlanet>;
	isExploring: boolean;
	setCurrentPlanet: (planet: Planets) => void;
	setPlanetData: (planetId: string, data: GamePlanet) => void;
	setIsExploring: (isExploring: boolean) => void;
}

export const usePlanetStore = create<PlanetState>((set) => ({
	currentPlanet: 'Earth',
	planets: {},
	isExploring: false,

	setCurrentPlanet: (planet) => set({ currentPlanet: planet }),

	setPlanetData: (planetId, data) => set((state) => ({
		planets: {
			...state.planets,
			[planetId]: data,
		},
	})),

	setIsExploring: (isExploring) => set({ isExploring }),
}));
