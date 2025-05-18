import React, { useRef, useState, createContext, useContext, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import StargateRoom from './components/environment/room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';
import StargateWormholeEffect from './components/stargate-travel-effect';
import WormholeOverlay from './components/wormhole-overlay';
import HelpReminder from './components/help-reminder';
import { Planets } from './types/index';
import { initializeGameData } from './data';
import { InteractionHint } from './components/hud/interaction-hint';
import { usePlayerStore } from './components/player';
import { useGameStore } from './components/game'; // Import game store
import './styles/main.scss';

// Create a context for location information
interface LocationContextType {
	planet: Planets;
	location: string;
	updateLocation: (planet: Planets, location: string) => void;
	startTravel: () => void;
	isInWormhole: boolean;
}

export const LocationContext = createContext<LocationContextType>({
	planet: 'Earth',
	location: 'Stargate Command',
	updateLocation: () => {},
	startTravel: () => {},
	isInWormhole: false
});

// Hook to easily access and update location
export const useLocation = () => useContext(LocationContext);

// Location display component
const LocationDisplay = () => {
	// Get location from player store instead of context
	const { currentPlanet, currentLocation, isInWormhole } = usePlayerStore();

	// Don't show location during wormhole travel
	if (isInWormhole) return null;

	return (
		<div className="game-ui">
			<h3>{currentPlanet} - {currentLocation}</h3>
		</div>
	);
};

// Character reference context
interface CharacterRefContextType {
	characterRef: React.RefObject<THREE.Group | null>;
}

export const CharacterRefContext = createContext<CharacterRefContextType>({
	characterRef: { current: null }
});

// Hook to easily access the character reference
export const useCharacterRef = () => useContext(CharacterRefContext);

export default function App() {
	// Character reference that will be provided by StargateRoom
	const characterRef = useRef<THREE.Group>(null);
	const travelCompletionTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer ref
	const TRAVEL_DURATION_MS = 3000; // Travel duration in milliseconds

	// Get player state from store
	const {
		currentPlanet,
		currentLocation,
		isInWormhole: playerIsInWormhole,
		travel,
		setIsInWormhole: setPlayerIsInWormhole
	} = usePlayerStore();

	// Get game store actions
	const { setIsInWormhole: setGameIsInWormhole } = useGameStore();

	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [initError, setInitError] = useState<string | null>(null);

	// Initialize the database
	useEffect(() => {
		async function init() {
			try {
				setIsLoading(true);
				await initializeGameData();
				console.log('Database initialized successfully');
				setIsLoading(false);
			} catch (error) {
				console.error('Failed to initialize database:', error);
				setInitError('Failed to initialize game data. Please refresh the page.');
				setIsLoading(false);
			}
		}

		init();
	}, []);

	// Travel Completion Logic
	useEffect(() => {
		if (playerIsInWormhole) {
			console.log('App detected isInWormhole=true, starting travel completion timer.');
			// Clear any existing timer first
			if (travelCompletionTimerRef.current) {
				clearTimeout(travelCompletionTimerRef.current);
			}

			travelCompletionTimerRef.current = setTimeout(() => {
				console.log('Travel duration complete. Finalizing travel...');

				// Determine target based on current location
				const targetPlanet = currentPlanet === 'Earth' ? 'Abydos' : 'Earth';
				const targetLocation = targetPlanet === 'Earth' ? 'Stargate Command' : 'Temple of Ra';

				// 1. Update player location in the store
				travel(targetPlanet, targetLocation);

				// 2. Reset wormhole state in BOTH stores
				console.log('Finalizing travel: Setting isInWormhole=false in Player and Game stores');
				setPlayerIsInWormhole(false);
				setGameIsInWormhole(false);

				// 3. Reset timer ref
				travelCompletionTimerRef.current = null;

				// NOTE: The onTravelComplete callback from StargateRoom is implicitly handled
				// because resetting playerIsInWormhole causes StargateRoom to remount,
				// which resets its internal state (stargateActive, activationStage).
			}, TRAVEL_DURATION_MS);
		} else {
			// If wormhole state becomes false externally, clear the timer
			if (travelCompletionTimerRef.current) {
				console.log('App detected isInWormhole=false, clearing travel completion timer.');
				clearTimeout(travelCompletionTimerRef.current);
				travelCompletionTimerRef.current = null;
			}
		}

		// Cleanup function for the effect
		return () => {
			if (travelCompletionTimerRef.current) {
				clearTimeout(travelCompletionTimerRef.current);
			}
		};
	}, [playerIsInWormhole, currentPlanet, travel, setPlayerIsInWormhole, setGameIsInWormhole]);


	// Update location handler - uses player store travel function
	const updateLocation = (planet: Planets, location: string) => {
		travel(planet, location);
	};

	// Handler for wormhole state - uses player store
	const handleWormholeState = (isInWormholeState: boolean) => {
		console.log('Setting wormhole state (via prop drill):', isInWormholeState); // Keep for debugging if needed
		// This is now mainly handled by the useEffect above
		// setPlayerIsInWormhole(isInWormholeState);
		// setGameIsInWormhole(isInWormholeState); // Ensure both are set if called externally
	};

	// Dummy startTravel function for the context
	const startTravel = () => {
		console.log('Travel starting from context handler (dummy)');
	};

	// Show loading screen while initializing
	if (isLoading) {
		return (
			<div className="loading-screen">
				<h2>Initializing Stargate Systems...</h2>
				<div className="loading-spinner"></div>
			</div>
		);
	}

	// Show error if initialization failed
	if (initError) {
		return (
			<div className="error-screen">
				<h2>Error</h2>
				<p>{initError}</p>
				<button onClick={() => window.location.reload()}>Retry</button>
			</div>
		);
	}

	return (
		<LocationContext.Provider
			value={{
				planet: currentPlanet,
				location: currentLocation,
				updateLocation,
				startTravel,
				isInWormhole: playerIsInWormhole // Context reflects player store
			}}
		>
			<CharacterRefContext.Provider value={{ characterRef }}>
				<div style={{ width: '100vw', height: '100vh', backgroundColor: '#111' }}>
					{/* DOM-based wormhole overlay effects (uses Game Store state) */}
					<WormholeOverlay />

					{/* Movement tutorial (hide during wormhole travel based on Player Store state) */}
					{!playerIsInWormhole && <MovementTutorial />}

					{/* Location info */}
					<LocationDisplay />

					{/* Interaction hint */}
					<InteractionHint />

					{/* Help Button - always visible */}
					<HelpReminder />

					{/* Main 3D Canvas */}
					<Canvas shadows>
						{/* Lighting */}
						<ambientLight intensity={0.3} />
						<directionalLight
							position={[10, 15, 5]}
							intensity={1}
							castShadow
							shadow-mapSize-width={2048}
							shadow-mapSize-height={2048}
							shadow-camera-far={50}
							shadow-camera-left={-20}
							shadow-camera-right={20}
							shadow-camera-top={20}
							shadow-camera-bottom={-20}
						/>

						{/* Wormhole travel effect (shown only when traveling - uses Player Store state) */}
						<StargateWormholeEffect
							active={playerIsInWormhole}
							onComplete={() => {
								// Completion is handled by the useEffect timer now
							}}
							duration={TRAVEL_DURATION_MS} // Use duration constant
						/>

						{/* Room and environment (hide during wormhole travel - uses Player Store state) */}
						{!playerIsInWormhole && (
							<StargateRoom
								planet={currentPlanet}
								characterRef={characterRef}
								// updateLocation={updateLocation} // No longer needed here, handled by travel()
								// setIsInWormhole={handleWormholeState} // No longer needed here, handled by useEffect
								// startTravel={startTravel} // No longer needed here
							/>
						)}

						{/* Camera that follows the character */}
						<CameraController
							target={characterRef}
							offset={[0, 3, 6]}
							lerp={0.1}
						/>
					</Canvas>
				</div>
			</CharacterRefContext.Provider>
		</LocationContext.Provider>
	);
}
