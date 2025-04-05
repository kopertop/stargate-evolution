import React, { useRef, useState, createContext, useContext } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterController from './components/character-controller';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';
import { OrbitControls } from '@react-three/drei';

// Create a context for location information
interface LocationContextType {
	planet: string;
	location: string;
	updateLocation: (planet: string, location: string) => void;
}

export const LocationContext = createContext<LocationContextType>({
	planet: 'Earth',
	location: 'Stargate Command',
	updateLocation: () => {},
});

// Hook to easily access and update location
export const useLocation = () => useContext(LocationContext);

// Small help reminder component with click functionality
const HelpReminder = () => {
	const handleHelpClick = () => {
		// Simulate pressing the ? key to show the help dialog
		const event = new KeyboardEvent('keydown', { key: '?' });
		window.dispatchEvent(event);
	};

	return (
		<div className="help-button" onClick={handleHelpClick}>
			?
		</div>
	);
};

// Location display component
const LocationDisplay = () => {
	const { planet, location } = useLocation();

	return (
		<div className="game-ui">
			<h3>{planet} - {location}</h3>
		</div>
	);
};

export default function App() {
	const characterRef = useRef<THREE.Group>(null);
	const [locationInfo, setLocationInfo] = useState({
		planet: 'Earth',
		location: 'Stargate Command'
	});

	// Function to update location that can be called from game logic
	const updateLocation = (planet: string, location: string) => {
		setLocationInfo({ planet, location });
	};

	return (
		<LocationContext.Provider
			value={{
				planet: locationInfo.planet,
				location: locationInfo.location,
				updateLocation
			}}
		>
			<div style={{ width: '100vw', height: '100vh', backgroundColor: '#111' }}>
				{/* Movement tutorial */}
				<MovementTutorial />

				{/* Location info */}
				<LocationDisplay />

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

					{/* Room and environment */}
					<StargateRoom />

					{/* Character */}
					<CharacterController ref={characterRef} />

					{/* Camera that follows the character */}
					<CameraController
						target={characterRef}
						offset={[0, 3, 6]}
						lerp={0.1}
					/>

					{/* Allow camera control with mouse */}
					<OrbitControls
						enablePan={false}
						maxPolarAngle={Math.PI / 2 - 0.1}
						minPolarAngle={Math.PI / 6}
					/>
				</Canvas>
			</div>
		</LocationContext.Provider>
	);
}
