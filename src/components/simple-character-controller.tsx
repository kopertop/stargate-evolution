import React, { forwardRef, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Character from './character';
import { useKeyboard } from '../hooks/use-keyboard';

interface SimpleCharacterControllerProps {
	speed?: number;
}

const SimpleCharacterController = forwardRef<THREE.Group, SimpleCharacterControllerProps>(
	({ speed = 0.1 }, ref) => {
		const characterRef = useRef<THREE.Group>(null);
		const { keys } = useKeyboard();
		const { camera } = useThree();

		// Handle character movement with keyboard
		useFrame((state, delta) => {
			if (!characterRef.current) return;

			// Calculate movement direction based on key presses
			const moveDirection = new THREE.Vector3(0, 0, 0);

			// Forward/backward
			if (keys.has('KeyW') || keys.has('ArrowUp')) moveDirection.z -= 1;
			if (keys.has('KeyS') || keys.has('ArrowDown')) moveDirection.z += 1;

			// Left/right
			if (keys.has('KeyA') || keys.has('ArrowLeft')) moveDirection.x -= 1;
			if (keys.has('KeyD') || keys.has('ArrowRight')) moveDirection.x += 1;

			// Camera rotation with Q/E keys - using fixed rotation speed
			const rotationSpeed = 0.03;
			if (keys.has('KeyQ')) {
				camera.rotation.y += rotationSpeed;
				console.log('Rotating camera left with Q key');
			}
			if (keys.has('KeyE')) {
				camera.rotation.y -= rotationSpeed;
				console.log('Rotating camera right with E key');
			}

			// Normalize for diagonal movement to maintain consistent speed
			if (moveDirection.length() > 0) {
				moveDirection.normalize();

				// Calculate new position
				const scaledSpeed = speed * delta * 60; // Adjust speed based on framerate
				characterRef.current.position.x += moveDirection.x * scaledSpeed;
				characterRef.current.position.z += moveDirection.z * scaledSpeed;

				// Update rotation to face movement direction
				if (moveDirection.x !== 0 || moveDirection.z !== 0) {
					const angle = Math.atan2(moveDirection.x, -moveDirection.z);
					characterRef.current.rotation.y = angle;
				}
			}
		});

		// Set initial camera position
		useFrame((state) => {
			if (characterRef.current) {
				// Position camera slightly behind and above character
				camera.position.set(
					characterRef.current.position.x,
					characterRef.current.position.y + 5,
					characterRef.current.position.z + 10
				);
				camera.lookAt(characterRef.current.position);

				// Run this only once
				state.invalidate();
			}
		}, 1);

		// Forward the ref to parent components
		React.useImperativeHandle(ref, () => characterRef.current!);

		return <Character ref={characterRef} />;
	}
);

export default SimpleCharacterController;
