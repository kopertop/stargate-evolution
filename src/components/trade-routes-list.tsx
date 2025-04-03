import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	Alert,
} from 'react-native';

import { TradeSystem, GameStateManager } from '../systems';
import { TradeRoute, Planet, ResourceType } from '../types/game-types';

interface TradeRoutesListProps {
	planetId?: string; // Optional - if provided, only show routes for this planet
}

const TradeRoutesList: React.FC<TradeRoutesListProps> = ({ planetId }) => {
	const [tradeRoutes, setTradeRoutes] = useState<TradeRoute[]>([]);
	const [planets, setPlanets] = useState<Record<string, Planet>>({});

	useEffect(() => {
		// Set up state subscriber
		const gameStateManager = GameStateManager.getInstance();
		const tradeSystem = TradeSystem.getInstance();

		const unsubscribe = gameStateManager.subscribe((state) => {
			setPlanets(state.player.planets);

			// Get routes based on planetId prop
			if (planetId) {
				setTradeRoutes(tradeSystem.getPlanetTradeRoutes(planetId));
			} else {
				setTradeRoutes(tradeSystem.getTradeRoutes());
			}
		});

		// Trigger initial load
		const state = gameStateManager.getState();
		setPlanets(state.player.planets);

		if (planetId) {
			setTradeRoutes(tradeSystem.getPlanetTradeRoutes(planetId));
		} else {
			setTradeRoutes(tradeSystem.getTradeRoutes());
		}

		return unsubscribe;
	}, [planetId]);

	// Format resources for display
	const formatResources = (resources: Record<string, number>) => {
		return Object.entries(resources)
			.filter(([_, amount]) => amount > 0)
			.map(([type, amount]) => `${type}: ${amount}`)
			.join(', ');
	};

	// Toggle route active status
	const toggleRouteStatus = (routeId: string, currentStatus: boolean) => {
		const tradeSystem = TradeSystem.getInstance();

		if (currentStatus) {
			tradeSystem.deactivateTradeRoute(routeId, 'Manually deactivated');
		} else {
			tradeSystem.activateTradeRoute(routeId);
		}
	};

	// Repair a route
	const repairRoute = (routeId: string) => {
		const tradeSystem = TradeSystem.getInstance();
		tradeSystem.repairTradeRoute(routeId);
	};

	// Delete a route
	const deleteRoute = (routeId: string) => {
		Alert.alert(
			'Delete Trade Route',
			'Are you sure you want to delete this trade route?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete',
					onPress: () => {
						const tradeSystem = TradeSystem.getInstance();
						tradeSystem.deleteTradeRoute(routeId);
					},
					style: 'destructive',
				},
			],
		);
	};

	// Render a trade route item
	const renderTradeRouteItem = ({ item }: { item: TradeRoute }) => {
		const sourcePlanet = planets[item.sourcePlanetId];
		const destPlanet = planets[item.destinationPlanetId];

		if (!sourcePlanet || !destPlanet) {
			return null; // Skip if planets don't exist
		}

		const efficiency = Math.round(item.efficiency * 100);
		const routeStatusColor = item.underAttack ? '#ff6b6b' : (item.active ? '#4CAF50' : '#999');

		return (
			<View style={[styles.routeItem, { borderLeftColor: routeStatusColor, borderLeftWidth: 4 }]}>
				<View style={styles.routeHeader}>
					<Text style={styles.routeTitle}>{sourcePlanet.name} → {destPlanet.name}</Text>

					<View style={styles.routeStatus}>
						<Text
							style={[
								styles.efficiency,
								{ color: efficiency < 50 ? '#ff6b6b' : efficiency > 80 ? '#4CAF50' : '#ff9800' },
							]}
						>
							{efficiency}% Efficiency
						</Text>

						{item.underAttack && (
							<Text style={styles.attackWarning}>UNDER ATTACK!</Text>
						)}
					</View>
				</View>

				<Text style={styles.routeResources}>
					Resources: {formatResources(item.resources as Record<string, number>)}
				</Text>

				<View style={styles.routeActions}>
					<TouchableOpacity
						style={[
							styles.actionButton,
							{ backgroundColor: item.active ? '#ddd' : '#4CAF50' },
						]}
						onPress={() => toggleRouteStatus(item.id, item.active)}
					>
						<Text style={styles.actionButtonText}>
							{item.active ? 'Deactivate' : 'Activate'}
						</Text>
					</TouchableOpacity>

					{item.underAttack && (
						<TouchableOpacity
							style={[styles.actionButton, styles.repairButton]}
							onPress={() => repairRoute(item.id)}
						>
							<Text style={styles.actionButtonText}>Repair</Text>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={[styles.actionButton, styles.deleteButton]}
						onPress={() => deleteRoute(item.id)}
					>
						<Text style={styles.actionButtonText}>Delete</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	if (tradeRoutes.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>No trade routes established.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Trade Routes</Text>

			<FlatList
				data={tradeRoutes}
				renderItem={renderTradeRouteItem}
				keyExtractor={item => item.id}
				style={styles.routesList}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	routesList: {
		flex: 1,
	},
	routeItem: {
		backgroundColor: 'white',
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1.5,
		elevation: 2,
	},
	routeHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	routeTitle: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	routeStatus: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	efficiency: {
		fontSize: 14,
		fontWeight: '500',
	},
	attackWarning: {
		marginLeft: 8,
		color: '#ff6b6b',
		fontWeight: 'bold',
	},
	routeResources: {
		fontSize: 14,
		color: '#666',
		marginBottom: 12,
	},
	routeActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	actionButton: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 4,
		marginLeft: 8,
	},
	repairButton: {
		backgroundColor: '#ff9800',
	},
	deleteButton: {
		backgroundColor: '#f44336',
	},
	actionButtonText: {
		color: 'white',
		fontWeight: '500',
	},
	emptyContainer: {
		padding: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		fontSize: 16,
		color: '#666',
		fontStyle: 'italic',
	},
});

export default TradeRoutesList;
