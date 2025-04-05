import React, { useRef, useEffect } from 'react';
import { useThree, useFrame, RootState } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraControllerProps {
	target: THREE.Object3D | null;
	offset?: [number, number, number];
	lerp?: number;
}

export default function CameraController({
	target,
	offset = [0, 5, 5],
	lerp = 0.1
}: CameraControllerProps) {
	const { camera } = useThree();
	const camPosRef = useRef(new THREE.Vector3(offset[0], offset[1], offset[2]));

	// Initialize camera position
	useEffect(() => {
		if (target) {
			const targetPosition = target.position.clone();
			camera.position.set(
				targetPosition.x + offset[0],
				targetPosition.y + offset[1],
				targetPosition.z + offset[2]
			);
			camera.lookAt(targetPosition);
		}
	}, [target, offset, camera]);

	// Update camera position to follow target
	useFrame((state: RootState, delta: number) => {
		if (!target) return;

		// Calculate target camera position
		const targetPosition = target.position.clone();
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
