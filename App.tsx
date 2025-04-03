import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

import TradeScreen from './src/screens/trade-screen';
import { GameStateManager, GameLoop } from './src/systems';

export default function App() {
	// Initialize game systems
	useEffect(() => {
		// Initialize game state and start the game loop
		const gameStateManager = GameStateManager.getInstance();
		const gameLoop = GameLoop.getInstance();

		// Start the game loop with a tick every 5 seconds
		gameLoop.start();

		// Clean up on unmount
		return () => {
			gameLoop.stop();
		};
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			<TradeScreen />
			<StatusBar style="auto" />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
});
