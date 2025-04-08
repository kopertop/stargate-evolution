import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Planets } from '../../types';

interface PlayerState {
	// Current location
	currentPlanet: Planets;
	currentLocation: string;

	// Previous location (for travel history)
	previousPlanet: Planets | null;
	previousLocation: string | null;

	// Travel state
	isInWormhole: boolean;
	hasCompletedTutorial: boolean;

	// Discovered planets and locations
	discoveredPlanets: Planets[];
	discoveredLocations: Record<string, string[]>; // planetId -> locationIds

	// Actions
	travel: (targetPlanet: Planets, targetLocation: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
	markLocationDiscovered: (planet: Planets, locationId: string) => void;
	markPlanetDiscovered: (planet: Planets) => void;
	completeTutorial: () => void;
}

export const usePlayerStore = create<PlayerState>()(
	persist(
		(set) => ({
			// Default starting location
			currentPlanet: 'Earth',
			currentLocation: 'Stargate Command',
			previousPlanet: null,
			previousLocation: null,
			isInWormhole: false,
			hasCompletedTutorial: false,
			discoveredPlanets: ['Earth'],
			discoveredLocations: { 'Earth': ['Stargate Command'] },

			// Travel to a new location
			travel: (targetPlanet, targetLocation) => set((state) => ({
				previousPlanet: state.currentPlanet,
				previousLocation: state.currentLocation,
				currentPlanet: targetPlanet,
				currentLocation: targetLocation,
				isInWormhole: false,
				// Auto-discover new planet and location when traveling there
				discoveredPlanets: state.discoveredPlanets.includes(targetPlanet)
					? state.discoveredPlanets
					: [...state.discoveredPlanets, targetPlanet],
				discoveredLocations: {
					...state.discoveredLocations,
					[targetPlanet]: state.discoveredLocations[targetPlanet]
						? state.discoveredLocations[targetPlanet].includes(targetLocation)
							? state.discoveredLocations[targetPlanet]
							: [...state.discoveredLocations[targetPlanet], targetLocation]
						: [targetLocation]
				}
			})),

			// Set wormhole travel state
			setIsInWormhole: (isInWormhole) => set({ isInWormhole }),

			// Mark a location as discovered
			markLocationDiscovered: (planet, locationId) => set((state) => ({
				discoveredLocations: {
					...state.discoveredLocations,
					[planet]: state.discoveredLocations[planet]
						? state.discoveredLocations[planet].includes(locationId)
							? state.discoveredLocations[planet]
							: [...state.discoveredLocations[planet], locationId]
						: [locationId]
				}
			})),

			// Mark a planet as discovered
			markPlanetDiscovered: (planet) => set((state) => ({
				discoveredPlanets: state.discoveredPlanets.includes(planet)
					? state.discoveredPlanets
					: [...state.discoveredPlanets, planet]
			})),

			// Mark tutorial as completed
			completeTutorial: () => set({ hasCompletedTutorial: true })
		}),
		{
			name: 'player-storage', // unique name for localStorage
			storage: createJSONStorage(() => localStorage),
		}
	)
);
