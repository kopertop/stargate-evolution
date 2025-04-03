import {
	TradeRoute,
	ResourceType,
	Planet,
	NotificationType,
} from '../types/game-types';
import { generateEntityId } from '../utils/id-generator';

import GameStateManager from './game-state-manager';

class TradeSystem {
	private static instance: TradeSystem;
	private gameStateManager: GameStateManager;

	private constructor() {
		this.gameStateManager = GameStateManager.getInstance();
	}

	public static getInstance(): TradeSystem {
		if (!TradeSystem.instance) {
			TradeSystem.instance = new TradeSystem();
		}
		return TradeSystem.instance;
	}

	// Create a new trade route between two planets
	public createTradeRoute(
		sourcePlanetId: string,
		destinationPlanetId: string,
		resources: Record<ResourceType, number>,
	): boolean {
		const state = this.gameStateManager.getState();

		// Check if both planets exist
		const sourcePlanet = state.player.planets[sourcePlanetId];
		const destinationPlanet = state.player.planets[destinationPlanetId];

		if (!sourcePlanet) {
			console.error(`Source planet ${sourcePlanetId} not found`);
			return false;
		}

		if (!destinationPlanet) {
			console.error(`Destination planet ${destinationPlanetId} not found`);
			return false;
		}

		// Check if both planets have stargates
		if (!sourcePlanet.hasStargate) {
			console.error(`Source planet ${sourcePlanet.name} does not have a stargate`);
			return false;
		}

		if (!destinationPlanet.hasStargate) {
			console.error(`Destination planet ${destinationPlanet.name} does not have a stargate`);
			return false;
		}

		// Validate resource amounts (strip zero or negative values)
		const validResources: Record<ResourceType, number> = {} as Record<ResourceType, number>;
		let hasResources = false;

		for (const resourceType of Object.values(ResourceType)) {
			const amount = resources[resourceType] || 0;
			if (amount > 0) {
				validResources[resourceType] = amount;
				hasResources = true;
			}
		}

		if (!hasResources) {
			console.error('No valid resources specified for trade route');
			return false;
		}

		// Check if planets have sufficient resources
		if (!this.hasSufficientResources(sourcePlanetId, validResources)) {
			console.error(`Source planet ${sourcePlanet.name} does not have sufficient resources for this trade route`);
			return false;
		}

		// Calculate efficiency based on planet distance and characteristics
		const efficiency = this.calculateTradeEfficiency(sourcePlanet, destinationPlanet);

		// Create trade route
		const newTradeRoute: TradeRoute = {
			id: generateEntityId('trade'),
			sourcePlanetId,
			destinationPlanetId,
			resources: validResources,
			efficiency,
			active: true,
			underAttack: false,
		};

		// Add trade route to state
		this.gameStateManager.updateState(state => ({
			...state,
			player: {
				...state.player,
				tradeRoutes: [...state.player.tradeRoutes, newTradeRoute],
			},
		}));

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Established',
			`A trade route has been established from ${sourcePlanet.name} to ${destinationPlanet.name} with ${Math.round(efficiency * 100)}% efficiency.`,
			NotificationType.SUCCESS,
		);

		return true;
	}

	// Calculate trade efficiency based on planet distance and characteristics
	private calculateTradeEfficiency(sourcePlanet: Planet, destinationPlanet: Planet): number {
		// Calculate 3D distance between planets
		const dx = sourcePlanet.position.x - destinationPlanet.position.x;
		const dy = sourcePlanet.position.y - destinationPlanet.position.y;
		const dz = sourcePlanet.position.z - destinationPlanet.position.z;
		const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

		// Base efficiency inversely proportional to distance
		const distanceEfficiency = Math.max(0.3, 1 - (distance / 200));

		// Threat level affects efficiency
		const sourceThreatFactor = 1 - (sourcePlanet.threatLevel * 0.5);
		const destThreatFactor = 1 - (destinationPlanet.threatLevel * 0.5);
		const threatEfficiency = (sourceThreatFactor + destThreatFactor) / 2;

		// Calculate final efficiency (0.0 to 1.0)
		return Math.min(distanceEfficiency * threatEfficiency, 1.0);
	}

	// Check if the source planet has sufficient resources
	private hasSufficientResources(planetId: string, resources: Record<ResourceType, number>): boolean {
		// In a more complex implementation, this would check planet production rates
		// For simplicity, we'll assume that the planet can sustain any reasonable amount
		return true;
	}

	// Process all trade routes
	public processTradeRoutes(): void {
		const state = this.gameStateManager.getState();

		// Process each active trade route
		state.player.tradeRoutes.forEach(route => {
			if (route.active) {
				this.processTradeRoute(route);
			}
		});
	}

	// Process a single trade route
	private processTradeRoute(route: TradeRoute): void {
		const state = this.gameStateManager.getState();

		// Check if both planets still exist
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		if (!sourcePlanet || !destinationPlanet) {
			// Deactivate route if either planet is missing
			this.deactivateTradeRoute(route.id, 'Planet no longer accessible');
			return;
		}

		// Calculate actual transfer amounts based on efficiency
		const transferResources: Record<string, number> = {};
		let totalTransferred = 0;

		Object.entries(route.resources).forEach(([resourceType, amount]) => {
			// Apply efficiency and randomize a bit
			const effectiveEfficiency = route.efficiency * (0.9 + Math.random() * 0.2);
			const transferAmount = Math.floor(amount * effectiveEfficiency);

			if (transferAmount > 0) {
				transferResources[resourceType] = transferAmount;
				totalTransferred += transferAmount;
			}
		});

		// If no resources transferred, skip
		if (totalTransferred === 0) return;

		// Update player resources
		this.gameStateManager.updateState(state => {
			const updatedResources = { ...state.player.resources };

			Object.entries(transferResources).forEach(([resourceType, amount]) => {
				updatedResources[resourceType as ResourceType] += amount;
			});

			return {
				...state,
				player: {
					...state.player,
					resources: updatedResources,
				},
			};
		});

		// Occasionally send a notification (not every time to avoid spam)
		if (Math.random() < 0.05) { // 5% chance
			this.gameStateManager.addNotification(
				'Trade Route Transfer',
				`Resources have been transferred from ${sourcePlanet.name} to ${destinationPlanet.name}.`,
				NotificationType.INFO,
			);
		}
	}

	// Deactivate a trade route
	public deactivateTradeRoute(routeId: string, reason: string): void {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return;
		}

		// Find planet names for notification
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];
		const sourceName = sourcePlanet?.name || 'Unknown';
		const destName = destinationPlanet?.name || 'Unknown';

		// Update route status
		this.gameStateManager.updateState(state => {
			const updatedRoutes = state.player.tradeRoutes.map(r => {
				if (r.id === routeId) {
					return { ...r, active: false };
				}
				return r;
			});

			return {
				...state,
				player: {
					...state.player,
					tradeRoutes: updatedRoutes,
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Deactivated',
			`The trade route from ${sourceName} to ${destName} has been deactivated. Reason: ${reason}`,
			NotificationType.WARNING,
		);
	}

	// Activate a trade route
	public activateTradeRoute(routeId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return false;
		}

		// Check if planets still exist
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		if (!sourcePlanet) {
			console.error(`Source planet for trade route ${routeId} no longer exists`);
			return false;
		}

		if (!destinationPlanet) {
			console.error(`Destination planet for trade route ${routeId} no longer exists`);
			return false;
		}

		// Activate route
		this.gameStateManager.updateState(state => {
			const updatedRoutes = state.player.tradeRoutes.map(r => {
				if (r.id === routeId) {
					return {
						...r,
						active: true,
						underAttack: false,
					};
				}
				return r;
			});

			return {
				...state,
				player: {
					...state.player,
					tradeRoutes: updatedRoutes,
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Activated',
			`The trade route from ${sourcePlanet.name} to ${destinationPlanet.name} has been activated.`,
			NotificationType.SUCCESS,
		);

		return true;
	}

	// Update a trade route's resources
	public updateTradeRouteResources(
		routeId: string,
		resources: Record<ResourceType, number>,
	): boolean {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return false;
		}

		// Validate resource amounts
		const validResources: Record<ResourceType, number> = {} as Record<ResourceType, number>;
		let hasResources = false;

		for (const resourceType of Object.values(ResourceType)) {
			const amount = resources[resourceType] || 0;
			if (amount > 0) {
				validResources[resourceType] = amount;
				hasResources = true;
			}
		}

		if (!hasResources) {
			console.error('No valid resources specified for trade route update');
			return false;
		}

		// Update route resources
		this.gameStateManager.updateState(state => {
			const updatedRoutes = state.player.tradeRoutes.map(r => {
				if (r.id === routeId) {
					return { ...r, resources: validResources };
				}
				return r;
			});

			return {
				...state,
				player: {
					...state.player,
					tradeRoutes: updatedRoutes,
				},
			};
		});

		// Find planet names for notification
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Updated',
			`The trade route from ${sourcePlanet?.name || 'Unknown'} to ${destinationPlanet?.name || 'Unknown'} has been updated with new resource allocations.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Delete a trade route
	public deleteTradeRoute(routeId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return false;
		}

		// Find planet names for notification
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		// Remove route
		this.gameStateManager.updateState(state => ({
			...state,
			player: {
				...state.player,
				tradeRoutes: state.player.tradeRoutes.filter(r => r.id !== routeId),
			},
		}));

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Deleted',
			`The trade route from ${sourcePlanet?.name || 'Unknown'} to ${destinationPlanet?.name || 'Unknown'} has been deleted.`,
			NotificationType.INFO,
		);

		return true;
	}

	// Simulate an attack on a trade route
	public attackTradeRoute(routeId: string): void {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return;
		}

		// Mark route as under attack and reduce efficiency
		this.gameStateManager.updateState(state => {
			const updatedRoutes = state.player.tradeRoutes.map(r => {
				if (r.id === routeId) {
					return {
						...r,
						underAttack: true,
						efficiency: r.efficiency * 0.5, // Reduce efficiency by half
					};
				}
				return r;
			});

			return {
				...state,
				player: {
					...state.player,
					tradeRoutes: updatedRoutes,
				},
			};
		});

		// Find planet names for notification
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Under Attack',
			`The trade route from ${sourcePlanet?.name || 'Unknown'} to ${destinationPlanet?.name || 'Unknown'} is under attack! Efficiency has been reduced.`,
			NotificationType.DANGER,
		);
	}

	// Repair a trade route
	public repairTradeRoute(routeId: string): boolean {
		const state = this.gameStateManager.getState();

		// Find the route
		const route = state.player.tradeRoutes.find(r => r.id === routeId);
		if (!route) {
			console.error(`Trade route ${routeId} not found`);
			return false;
		}

		// Calculate original efficiency
		const sourcePlanet = state.player.planets[route.sourcePlanetId];
		const destinationPlanet = state.player.planets[route.destinationPlanetId];

		if (!sourcePlanet || !destinationPlanet) {
			console.error('Cannot repair route: one or both planets no longer exist');
			return false;
		}

		const newEfficiency = this.calculateTradeEfficiency(sourcePlanet, destinationPlanet);

		// Update route
		this.gameStateManager.updateState(state => {
			const updatedRoutes = state.player.tradeRoutes.map(r => {
				if (r.id === routeId) {
					return {
						...r,
						underAttack: false,
						efficiency: newEfficiency,
					};
				}
				return r;
			});

			return {
				...state,
				player: {
					...state.player,
					tradeRoutes: updatedRoutes,
				},
			};
		});

		// Add notification
		this.gameStateManager.addNotification(
			'Trade Route Repaired',
			`The trade route from ${sourcePlanet.name} to ${destinationPlanet.name} has been repaired. Efficiency restored to ${Math.round(newEfficiency * 100)}%.`,
			NotificationType.SUCCESS,
		);

		return true;
	}

	// Get all trade routes
	public getTradeRoutes(): TradeRoute[] {
		const state = this.gameStateManager.getState();
		return [...state.player.tradeRoutes];
	}

	// Get trade routes for a specific planet
	public getPlanetTradeRoutes(planetId: string): TradeRoute[] {
		const state = this.gameStateManager.getState();
		return state.player.tradeRoutes.filter(route =>
			route.sourcePlanetId === planetId || route.destinationPlanetId === planetId,
		);
	}
}

export default TradeSystem;
