import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterController from './components/character-controller';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';
import { OrbitControls } from '@react-three/drei';

// Small help reminder component with click functionality
const HelpReminder = () => {
	const [showHelp, setShowHelp] = useState(false);

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

export default function App() {
	const [showTradeScreen, setShowTradeScreen] = useState(false);
	const characterRef = useRef<THREE.Mesh>(null);

	return (
		<div style={{ width: '100vw', height: '100vh', backgroundColor: '#111' }}>
			{/* Movement tutorial */}
			<MovementTutorial />

			{/* Game info UI */}
			<div className="game-ui">
				<h3>Stargate Evolution</h3>

				<div className="game-controls">
					<p className="control-hint">WASD or Arrow Keys to move</p>
					<button
						onClick={() => setShowTradeScreen(!showTradeScreen)}
						style={{ marginTop: '10px' }}
					>
						{showTradeScreen ? 'Hide Trade' : 'Show Trade'}
					</button>
				</div>
			</div>

			{/* Trade UI */}
			{showTradeScreen && <div className="trade-screen-placeholder">Trade UI goes here</div>}

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
	);
}
