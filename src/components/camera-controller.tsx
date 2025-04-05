import React, { useRef, useEffect, RefObject } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// More flexible interface that accepts any ref to an object with a position
interface CameraControllerProps {
	target: RefObject<any>; // Accept any ref that has a position property
	offset?: [number, number, number];
	lerp?: number;
}

export default function CameraController({
	target,
	offset = [0, 5, 5],
	lerp = 0.1
}: CameraControllerProps) {
	const { camera } = useThree();
	const initializedRef = useRef(false);
	const defaultPosition = useRef(new THREE.Vector3(0, offset[1], offset[2]));

	// Cache last known target information
	const lastTargetInfo = useRef({
		position: new THREE.Vector3(),
		rotation: new THREE.Euler()
	});

	// Initialize camera position as soon as target becomes available
	useEffect(() => {
		if (target.current && target.current.position && !initializedRef.current) {
			const targetPosition = target.current.position.clone();
			camera.position.set(
				targetPosition.x + offset[0],
				targetPosition.y + offset[1],
				targetPosition.z + offset[2]
			);
			camera.lookAt(targetPosition);
			initializedRef.current = true;

			// Initialize last known target info
			lastTargetInfo.current.position.copy(targetPosition);
			if (target.current.rotation) {
				lastTargetInfo.current.rotation.copy(target.current.rotation);
			}
		} else if (!target.current && !initializedRef.current) {
			// Set a default camera position if target not yet available
			camera.position.set(defaultPosition.current.x, defaultPosition.current.y, defaultPosition.current.z);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		}
	}, [target, offset, camera]);

	// Update camera position to follow target
	useFrame((state, delta) => {
		if (!target.current || !target.current.position) return;

		const targetPosition = target.current.position.clone();
		const targetRotation = target.current.rotation ? target.current.rotation : new THREE.Euler();

		// Check if target has a cameraRotation property (added in CharacterController)
		const cameraRotation = target.current.userData?.cameraRotation || 0;

		// Calculate camera position based on target position and rotation
		let cameraOffset = new THREE.Vector3(offset[0], offset[1], offset[2]);

		// Apply camera rotation if present
		if (cameraRotation !== 0) {
			// Rotate the offset around the Y axis based on camera rotation
			const rotationMatrix = new THREE.Matrix4().makeRotationY(cameraRotation);
			cameraOffset.applyMatrix4(rotationMatrix);
		}

		// Calculate target camera position by adding rotated offset to target position
		const cameraTargetPosition = targetPosition.clone().add(cameraOffset);

		// Use a higher lerp value for faster camera response when rotating
		// The larger the camera rotation, the faster we should move
		const isRotating = Math.abs(cameraRotation) > 0.1;
		const responsiveLerp = isRotating ?
			Math.min(lerp * 3, 1.0) : // Faster during rotation
			Math.min(lerp * 1.5, 1.0); // Standard follow

		// Smoothly interpolate current camera position toward target position
		camera.position.lerp(cameraTargetPosition, responsiveLerp);

		// Make camera look at the target
		camera.lookAt(targetPosition);

		// Update last known target info
		lastTargetInfo.current.position.copy(targetPosition);
		lastTargetInfo.current.rotation.copy(targetRotation);
	});

	return null;
}
