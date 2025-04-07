import React, { forwardRef, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../../hooks/use-keyboard';
import {
	generateRoomColliders,
	checkAndResolveCollision,
	RoomDimensions,
	InteractableObject
} from '../../utils/collision-utils';
import { Character } from './character';

interface SimpleCharacterControllerProps {
	speed?: number;
	roomDimensions?: RoomDimensions;
	stargatePosition?: THREE.Vector3;
	dhdPosition?: THREE.Vector3;
}

export const SimpleCharacterController = forwardRef<THREE.Group, SimpleCharacterControllerProps>(
	({
		speed = 0.05,
		roomDimensions = { size: [20, 20], wallHeight: 5 },
		stargatePosition = new THREE.Vector3(0, 0, -5),
		dhdPosition = new THREE.Vector3(5, 0, 0)
	}, ref) => {
		const characterRef = useRef<THREE.Group>(null);
		const { keys } = useKeyboard();
		const { camera, scene } = useThree();
		const cameraOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 10));
		const [walls, setWalls] = useState(() => generateRoomColliders(roomDimensions));
		const characterRadius = 0.3; // Character collision radius

		// Reference to the wall meshes
		const wallMeshesRef = useRef<THREE.Mesh[]>([]);

		// Raycaster for wall transparency
		const raycaster = new THREE.Raycaster();

		// Store original wall materials for restoration
		const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(
			new Map()
		);

		// Transparent material for walls
		const transparentMaterial = new THREE.MeshStandardMaterial({
			color: '#ffffff',
			transparent: true,
			opacity: 0.2,
			side: THREE.DoubleSide
		});

		// Create interactable objects for collision detection
		const [interactableObjects, setInteractableObjects] = useState<InteractableObject[]>([
			{
				type: 'stargate',
				position: stargatePosition,
				radius: 2.0 // Stargate radius for collision
			},
			{
				type: 'dhd',
				position: dhdPosition,
				radius: 0.8 // DHD radius for collision
			}
		]);

		// Find wall meshes in the scene
		useEffect(() => {
			const findWallMeshes = () => {
				const wallMeshes: THREE.Mesh[] = [];
				scene.traverse((object) => {
					// Look for meshes that match our wall criteria (position, size, etc.)
					if (object instanceof THREE.Mesh &&
						object.geometry instanceof THREE.BoxGeometry &&
						object.geometry.parameters.width > 5 && // Wall-sized
						Math.abs(object.position.y - roomDimensions.wallHeight / 2) < 0.1) {
						wallMeshes.push(object);

						// Store original materials
						if (!originalMaterialsRef.current.has(object)) {
							originalMaterialsRef.current.set(object, object.material);
						}
					}
				});
				return wallMeshes;
			};

			// Wait for next frame to ensure scene is populated
			const timeoutId = setTimeout(() => {
				wallMeshesRef.current = findWallMeshes();
				console.log(`Found ${wallMeshesRef.current.length} wall meshes`);
			}, 500);

			return () => clearTimeout(timeoutId);
		}, [scene, roomDimensions]);

		// Update walls if room dimensions change
		useEffect(() => {
			setWalls(generateRoomColliders(roomDimensions));
		}, [roomDimensions]);

		// Update interactable objects if their positions change
		useEffect(() => {
			setInteractableObjects([
				{
					type: 'stargate',
					position: stargatePosition,
					radius: 2.0
				},
				{
					type: 'dhd',
					position: dhdPosition,
					radius: 0.8
				}
			]);
		}, [stargatePosition, dhdPosition]);

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
			const rotationSpeed = 0.02;

			if (keys.has('KeyQ')) {
				// Rotate camera offset around Y axis
				const currentOffset = cameraOffsetRef.current.clone();
				const angle = rotationSpeed;
				const cosA = Math.cos(angle);
				const sinA = Math.sin(angle);

				cameraOffsetRef.current.x = currentOffset.x * cosA - currentOffset.z * sinA;
				cameraOffsetRef.current.z = currentOffset.x * sinA + currentOffset.z * cosA;
			}

			if (keys.has('KeyE')) {
				// Rotate camera offset around Y axis (opposite direction)
				const currentOffset = cameraOffsetRef.current.clone();
				const angle = -rotationSpeed;
				const cosA = Math.cos(angle);
				const sinA = Math.sin(angle);

				cameraOffsetRef.current.x = currentOffset.x * cosA - currentOffset.z * sinA;
				cameraOffsetRef.current.z = currentOffset.x * sinA + currentOffset.z * cosA;
			}

			// Normalize for diagonal movement to maintain consistent speed
			if (moveDirection.length() > 0) {
				moveDirection.normalize();

				// Calculate new position with collision detection
				const scaledSpeed = speed * delta * 60; // Adjust speed based on framerate
				const currentPosition = characterRef.current.position.clone();
				const targetPosition = currentPosition.clone().add(
					new THREE.Vector3(
						moveDirection.x * scaledSpeed,
						0,
						moveDirection.z * scaledSpeed
					)
				);

				// Check for collisions and get the corrected position
				const newPosition = checkAndResolveCollision(
					currentPosition,
					targetPosition,
					characterRadius,
					walls,
					interactableObjects
				);

				// Update character position
				characterRef.current.position.copy(newPosition);

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

			// Handle see-through walls
			if (wallMeshesRef.current.length > 0) {
				// Direction from camera to character
				const cameraToCharacter = characterPos.clone().sub(camera.position).normalize();

				// Set up raycaster from camera to character
				raycaster.set(camera.position, cameraToCharacter);

				// Reset all walls to original material first
				wallMeshesRef.current.forEach(wall => {
					if (originalMaterialsRef.current.has(wall)) {
						wall.material = originalMaterialsRef.current.get(wall)!;
					}
				});

				// Check which walls are between camera and character
				const intersects = raycaster.intersectObjects(wallMeshesRef.current, false);

				// Make intersected walls transparent
				for (const intersection of intersects) {
					const wall = intersection.object as THREE.Mesh;

					// Only make the wall transparent if it's not the one the character is standing on
					if (Math.abs(wall.position.y - characterPos.y) > 1) {
						wall.material = transparentMaterial;
					}
				}
			}
		});

		// Forward the ref to parent components
		React.useImperativeHandle(ref, () => characterRef.current!);

		return <Character ref={characterRef} color="#4287f5" />;
	}
);

SimpleCharacterController.displayName = 'SimpleCharacterController';
