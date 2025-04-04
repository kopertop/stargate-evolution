import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	TextInput,
	Alert,
} from 'react-native';

import { TradeSystem, GameStateManager } from '../systems';
import { Planet, ResourceType } from '../types/game-types';

interface Planet {
	id: string;
	name: string;
}

interface TradeRouteCreatorProps {
	onCreateRoute: (sourceId: string, targetId: string, value: number) => void;
	planets: Planet[];
}

const TradeRouteCreator: React.FC<TradeRouteCreatorProps> = ({ onCreateRoute, planets }) => {
	const [planets, setPlanets] = useState<Record<string, Planet>>({});
	const [sourcePlanetId, setSourcePlanetId] = useState<string | null>(null);
	const [destinationPlanetId, setDestinationPlanetId] = useState<string | null>(null);
	const [resourceAmounts, setResourceAmounts] = useState<Record<ResourceType, string>>({
		[ResourceType.MINERAL]: '0',
		[ResourceType.ORGANIC]: '0',
		[ResourceType.ENERGY]: '0',
		[ResourceType.EXOTIC]: '0',
		[ResourceType.NAQUADAH]: '0',
	});
	const [selectingSource, setSelectingSource] = useState(true);
	const [routeValue, setRouteValue] = useState(1);

	// Load planets on mount
	useEffect(() => {
		const gameStateManager = GameStateManager.getInstance();

		const unsubscribe = gameStateManager.subscribe(state => {
			setPlanets(state.player.planets);
		});

		// Initial load
		const state = gameStateManager.getState();
		setPlanets(state.player.planets);

		return unsubscribe;
	}, []);

	// Filter planets that have stargates
	const getPlanetsWithStargates = () => {
		return Object.values(planets).filter(planet => planet.hasStargate);
	};

	// Handle planet selection
	const handlePlanetSelect = (planetId: string) => {
		if (selectingSource) {
			setSourcePlanetId(planetId);
			setSelectingSource(false);
		} else {
			setDestinationPlanetId(planetId);
		}
	};

	// Handle resource amount change
	const handleResourceChange = (type: ResourceType, value: string) => {
		// Only allow numeric input
		if (/^\d*$/.test(value)) {
			setResourceAmounts(prev => ({
				...prev,
				[type]: value,
			}));
		}
	};

	// Reset the form
	const resetForm = () => {
		setSourcePlanetId(null);
		setDestinationPlanetId(null);
		setSelectingSource(true);
		setResourceAmounts({
			[ResourceType.MINERAL]: '0',
			[ResourceType.ORGANIC]: '0',
			[ResourceType.ENERGY]: '0',
			[ResourceType.EXOTIC]: '0',
			[ResourceType.NAQUADAH]: '0',
		});
		setRouteValue(1);
	};

	// Create the trade route
	const handleCreateRoute = () => {
		if (sourcePlanetId && destinationPlanetId) {
			onCreateRoute(sourcePlanetId, destinationPlanetId, routeValue);
			resetForm();
		}
	};

	// Render a planet item
	const renderPlanetItem = ({ item }: { item: Planet }) => (
		<TouchableOpacity
			style={[
				styles.planetItem,
				selectingSource && sourcePlanetId === item.id && styles.selectedPlanet,
				!selectingSource && destinationPlanetId === item.id && styles.selectedPlanet,
			]}
			onPress={() => handlePlanetSelect(item.id)}
		>
			<Text style={styles.planetName}>{item.name}</Text>
			<Text style={styles.planetInfo}>
				Climate: {item.climate}, Address: {item.address}
			</Text>
		</TouchableOpacity>
	);

	// Render resource inputs
	const renderResourceInputs = () => (
		<View style={styles.resourcesContainer}>
			<Text style={styles.sectionTitle}>Resource Allocation</Text>

			{Object.values(ResourceType).map(type => (
				<View key={type} style={styles.resourceInput}>
					<Text style={styles.resourceLabel}>{type}:</Text>
					<TextInput
						style={styles.input}
						value={resourceAmounts[type]}
						onChangeText={(value) => handleResourceChange(type, value)}
						keyboardType="numeric"
						placeholder="0"
					/>
				</View>
			))}
		</View>
	);

	// Render the source/destination planet selection
	const renderPlanetSelection = () => {
		const planetsWithStargates = getPlanetsWithStargates();

		return (
			<View style={styles.selectionContainer}>
				<Text style={styles.sectionTitle}>
					Select {selectingSource ? 'Source' : 'Destination'} Planet
				</Text>

				{planetsWithStargates.length === 0 ? (
					<Text style={styles.emptyMessage}>
						No planets with stargates available
					</Text>
				) : (
					<FlatList
						data={planetsWithStargates}
						renderItem={renderPlanetItem}
						keyExtractor={item => item.id}
						style={styles.planetList}
					/>
				)}
			</View>
		);
	};

	// Render selected planets summary
	const renderSelectedPlanets = () => {
		const source = sourcePlanetId ? planets[sourcePlanetId] : null;
		const destination = destinationPlanetId ? planets[destinationPlanetId] : null;

		return (
			<View style={styles.selectedPlanetsContainer}>
				<Text style={styles.sectionTitle}>Trade Route</Text>

				<View style={styles.routeInfo}>
					<Text>From: {source ? source.name : 'Not selected'}</Text>
					<Text style={styles.arrow}>→</Text>
					<Text>To: {destination ? destination.name : 'Not selected'}</Text>
				</View>

				<TouchableOpacity
					style={styles.resetButton}
					onPress={resetForm}
				>
					<Text style={styles.resetButtonText}>Reset Selection</Text>
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Establish Trade Route</Text>

			{renderSelectedPlanets()}

			{sourcePlanetId && destinationPlanetId ? (
				renderResourceInputs()
			) : (
				renderPlanetSelection()
			)}

			<div className="form-group">
				<label htmlFor="value">Route Value:</label>
				<input
					id="value"
					type="number"
					min="1"
					max="10"
					value={routeValue}
					onChange={(e) => setRouteValue(Number(e.target.value))}
				/>
			</div>

			{sourcePlanetId && destinationPlanetId && (
				<TouchableOpacity
					style={styles.createButton}
					onPress={handleCreateRoute}
					disabled={!sourcePlanetId || !destinationPlanetId || sourcePlanetId === destinationPlanetId}
				>
					<Text style={styles.createButtonText}>Create Trade Route</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	selectionContainer: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	planetList: {
		maxHeight: 300,
	},
	planetItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	selectedPlanet: {
		backgroundColor: '#e6f7ff',
	},
	planetName: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	planetInfo: {
		fontSize: 14,
		color: '#666',
	},
	emptyMessage: {
		fontStyle: 'italic',
		color: '#999',
	},
	selectedPlanetsContainer: {
		marginBottom: 16,
		padding: 12,
		backgroundColor: '#f5f5f5',
		borderRadius: 8,
	},
	routeInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	arrow: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	resetButton: {
		padding: 8,
		backgroundColor: '#f0f0f0',
		borderRadius: 4,
		alignItems: 'center',
	},
	resetButtonText: {
		color: '#666',
	},
	resourcesContainer: {
		marginBottom: 16,
	},
	resourceInput: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	resourceLabel: {
		width: 100,
		fontSize: 14,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
		padding: 8,
	},
	createButton: {
		backgroundColor: '#4CAF50',
		padding: 16,
		borderRadius: 4,
		alignItems: 'center',
	},
	createButtonText: {
		color: 'white',
		fontWeight: 'bold',
	},
});

export default TradeRouteCreator;
