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
		} else if (!target.current && !initializedRef.current) {
			// Set a default camera position if target not yet available
			camera.position.set(defaultPosition.current.x, defaultPosition.current.y, defaultPosition.current.z);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		}
	}, [target, offset, camera]);

	// Update camera position to follow target
	useFrame((state, delta) => {
		if (!target.current || !target.current.position) return;

		// Calculate target camera position
		const targetPosition = target.current.position.clone();
		const cameraTargetPosition = new THREE.Vector3(
			targetPosition.x + offset[0],
			targetPosition.y + offset[1],
			targetPosition.z + offset[2]
		);

		// Smoothly interpolate current camera position toward target position
		camera.position.lerp(cameraTargetPosition, lerp);

		// Make camera look at the target
		camera.lookAt(targetPosition);
	});

	return null;
}
