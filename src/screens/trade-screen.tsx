import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import TradeRouteCreator from '../components/trade-route-creator';
import TradeRoutesList from '../components/trade-routes-list';

enum TradeTab {
	ROUTES = 'ROUTES',
	CREATE = 'CREATE'
}

const TradeScreen: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TradeTab>(TradeTab.ROUTES);
	const [selectedPlanetId, setSelectedPlanetId] = useState<string | undefined>(undefined);

	// Render the tab buttons
	const renderTabs = () => (
		<View style={styles.tabContainer}>
			<TouchableOpacity
				style={[
					styles.tabButton,
					activeTab === TradeTab.ROUTES && styles.activeTabButton,
				]}
				onPress={() => setActiveTab(TradeTab.ROUTES)}
			>
				<Text
					style={[
						styles.tabButtonText,
						activeTab === TradeTab.ROUTES && styles.activeTabButtonText,
					]}
				>
					Trade Routes
				</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={[
					styles.tabButton,
					activeTab === TradeTab.CREATE && styles.activeTabButton,
				]}
				onPress={() => setActiveTab(TradeTab.CREATE)}
			>
				<Text
					style={[
						styles.tabButtonText,
						activeTab === TradeTab.CREATE && styles.activeTabButtonText,
					]}
				>
					Establish Route
				</Text>
			</TouchableOpacity>
		</View>
	);

	// Render the active tab content
	const renderContent = () => {
		switch (activeTab) {
		case TradeTab.ROUTES:
			return <TradeRoutesList planetId={selectedPlanetId} />;
		case TradeTab.CREATE:
			return <TradeRouteCreator />;
		default:
			return null;
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.headerTitle}>Trade Operations</Text>

			{renderTabs()}

			<View style={styles.contentContainer}>
				{renderContent()}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginVertical: 16,
		marginHorizontal: 16,
	},
	tabContainer: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		marginBottom: 16,
	},
	tabButton: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
	},
	activeTabButton: {
		borderBottomWidth: 2,
		borderBottomColor: '#1e88e5',
	},
	tabButtonText: {
		fontSize: 16,
		color: '#666',
	},
	activeTabButtonText: {
		fontWeight: 'bold',
		color: '#1e88e5',
	},
	contentContainer: {
		flex: 1,
	},
});

export default TradeScreen;
