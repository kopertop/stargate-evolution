import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, RootState } from '@react-three/fiber';
import * as THREE from 'three';
import CharacterController from './components/character-controller';
import StargateRoom from './components/stargate-room';
import CameraController from './components/camera-controller';
import MovementTutorial from './components/movement-tutorial';

// Basic mesh component for testing
function Box(props: any) {
	const meshRef = useRef<THREE.Mesh>(null!);

	// This effect is just for visuals, not game logic
	useFrame((state: RootState, delta: number) => {
		if (meshRef.current) {
			meshRef.current.rotation.x += delta * 0.2;
		}
	});

	return (
		<mesh
			{...props}
			ref={meshRef}
			scale={1}>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial color={'#2f74c0'} />
		</mesh>
	);
}

// Basic planet mesh for visualization
function Planet(props: any) {
	return (
		<mesh {...props}>
			<sphereGeometry args={[1, 32, 32]} />
			<meshStandardMaterial color={props.color || '#208020'} />
		</mesh>
	);
}

// Main scene component that contains all 3D elements
function GameScene() {
	const characterRef = useRef<THREE.Mesh>(null);
	const [ready, setReady] = useState(false);

	// Set ready state once the character ref is available
	useEffect(() => {
		if (characterRef.current) {
			setReady(true);
		}
	}, [characterRef.current]);

	return (
		<>
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

			{/* Stargate room environment */}
			<StargateRoom />

			{/* Character with keyboard controls */}
			<CharacterController ref={characterRef} speed={0.1} />

			{/* Camera that follows the character */}
			<CameraController
				target={characterRef.current}
				offset={[0, 3, 5]}
				lerp={0.05}
			/>

			{/* Coordinate helpers */}
			<axesHelper args={[5]} />
			<gridHelper args={[20, 20]} />
		</>
	);
}

export default function App() {
	const [showTradeScreen, setShowTradeScreen] = useState(false);

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

			{/* Main 3D Canvas */}
			<Canvas shadows>
				<GameScene />
			</Canvas>
		</div>
	);
}
