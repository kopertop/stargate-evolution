import React, { forwardRef, useRef, useEffect } from 'react';
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
		const cameraOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 10));

		// Initialize camera position once
		useEffect(() => {
			if (characterRef.current) {
				const pos = characterRef.current.position;
				camera.position.set(
					pos.x + cameraOffsetRef.current.x,
					pos.y + cameraOffsetRef.current.y,
					pos.z + cameraOffsetRef.current.z
				);
				camera.lookAt(pos);
			}
		}, [camera]);

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
				// Rotate camera offset around Y axis
				const currentOffset = cameraOffsetRef.current.clone();
				const angle = rotationSpeed;
				const cosA = Math.cos(angle);
				const sinA = Math.sin(angle);

				cameraOffsetRef.current.x = currentOffset.x * cosA - currentOffset.z * sinA;
				cameraOffsetRef.current.z = currentOffset.x * sinA + currentOffset.z * cosA;

				console.log('Q pressed - rotating camera left');
			}

			if (keys.has('KeyE')) {
				// Rotate camera offset around Y axis (opposite direction)
				const currentOffset = cameraOffsetRef.current.clone();
				const angle = -rotationSpeed;
				const cosA = Math.cos(angle);
				const sinA = Math.sin(angle);

				cameraOffsetRef.current.x = currentOffset.x * cosA - currentOffset.z * sinA;
				cameraOffsetRef.current.z = currentOffset.x * sinA + currentOffset.z * cosA;

				console.log('E pressed - rotating camera right');
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

			// Update camera position to follow character with current offset
			const characterPos = characterRef.current.position;
			camera.position.set(
				characterPos.x + cameraOffsetRef.current.x,
				characterPos.y + cameraOffsetRef.current.y,
				characterPos.z + cameraOffsetRef.current.z
			);
			camera.lookAt(characterPos);
		});

		// Forward the ref to parent components
		React.useImperativeHandle(ref, () => characterRef.current!);

		return <Character ref={characterRef} />;
	}
);

export default SimpleCharacterController;
