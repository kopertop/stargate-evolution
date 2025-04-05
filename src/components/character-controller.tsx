import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useFrame, RootState, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterControllerProps {
	speed?: number;
	onInteract?: (target: THREE.Object3D | null) => void;
	interactionRadius?: number; // How close the player needs to be to interact
	interactionAngle?: number; // Field of view angle for interaction (in degrees)
}

// Define wall boundaries as rectangular zones
const WALLS = [
	// Back wall
	{ minX: -10, maxX: 10, minZ: -10.25, maxZ: -9.75 },
	// Left wall
	{ minX: -10.25, maxX: -9.75, minZ: -10, maxZ: 10 },
	// Right wall
	{ minX: 9.75, maxX: 10.25, minZ: -10, maxZ: 10 },

	// Stargate (treated as a circular collision zone, handled separately)
	// DHD (treated as a collision zone, handled separately)
];

// Character radius for collision
const CHARACTER_RADIUS = 0.5;

// Distance at which an object is considered "extremely close" and direction check is skipped
const EXTREMELY_CLOSE_DISTANCE = 2.5;

// Interactive objects data
const INTERACTIVE_OBJECTS = [
	{ name: 'dhd', position: new THREE.Vector3(8, 0.5, 0), radius: 1.5 },
	{ name: 'stargate', position: new THREE.Vector3(0, 2.5, -9), radius: 3 }
];

const CharacterController = forwardRef<THREE.Mesh, CharacterControllerProps>(
	({
		speed = 0.12,
		onInteract = () => {},
		interactionRadius = 3.5, // Default interaction radius
		interactionAngle = 60    // Default field of view angle in degrees
	}, ref) => {
		const characterRef = useRef<THREE.Mesh>(null!);
		const keysPressed = useRef<Record<string, boolean>>({});
		const [isMoving, setIsMoving] = useState(false);
		const animationTimeRef = useRef(0);
		const { scene } = useThree();
		const raycaster = useRef(new THREE.Raycaster());
		const lookDirection = useRef(new THREE.Vector3(0, 0, -1));

		// Keep track of the last frame we checked for interactions
		const lastInteractionCheckRef = useRef(0);
		// How often to check for interactions (in seconds)
		const INTERACTION_CHECK_INTERVAL = 0.1;

		// Expose the internal mesh ref to parent components via forwarded ref
		useImperativeHandle(ref, () => characterRef.current);

		// Check what's in front of the character
		const checkInteraction = () => {
			if (!characterRef.current) return;

			// Get character position and facing direction
			const characterPosition = characterRef.current.position.clone();
			const facingDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(characterRef.current.quaternion);
			lookDirection.current = facingDirection;

			// Convert interaction angle to radians and calculate the cosine of half the angle
			// This will be used to check if an object is within our field of view
			const halfInteractionAngleRadians = THREE.MathUtils.degToRad(interactionAngle / 2);
			const cosHalfAngle = Math.cos(halfInteractionAngleRadians);

			// Initialize variables to track the closest interactive object
			let closestObject: THREE.Object3D | null = null;
			let closestDistance = Infinity;
			let closestObjectName = '';

			// Check each interactive object
			for (const object of INTERACTIVE_OBJECTS) {
				// Calculate vector to the object
				const toObject = object.position.clone().sub(characterPosition);

				// Ignore Y axis for distance calculation (2D distance)
				const toObject2D = new THREE.Vector2(toObject.x, toObject.z);
				const distance2D = toObject2D.length();

				// Check if the object is within interaction radius
				if (distance2D <= interactionRadius) {
					// Check if we're extremely close to the object
					const extremelyClose = distance2D <= EXTREMELY_CLOSE_DISTANCE;

					// If we're extremely close OR the object is in our field of view
					if (extremelyClose || isDotProductInFieldOfView(facingDirection, toObject, cosHalfAngle)) {
						// If this object is closer than the previously found closest object, update
						if (distance2D < closestDistance) {
							// Use raycasting to find the actual mesh within the interactive object
							const rayDirection = extremelyClose ? toObject.normalize() : facingDirection;
							raycaster.current.set(characterPosition, rayDirection);
							const intersects = raycaster.current.intersectObjects(scene.children, true);

							// Find the first intersection that belongs to our target object
							const targetName = object.name;
							const objectIntersect = findObjectIntersection(intersects, targetName, extremelyClose);

							if (objectIntersect) {
								closestObject = objectIntersect.object;
								closestDistance = distance2D;
								closestObjectName = object.name;
							}
						}
					}
				}
			}

			// If we found an interactive object within range and field of view, notify via callback
			if (closestObject) {
				onInteract(closestObject);
			} else {
				onInteract(null);
			}
		};

		// Check if dot product indicates the object is in our field of view
		const isDotProductInFieldOfView = (facingDirection: THREE.Vector3, toObject: THREE.Vector3, cosHalfAngle: number): boolean => {
			// Normalize the vectors for the dot product
			const normalizedToObject = toObject.clone().normalize();

			// Calculate dot product between facing direction and direction to object
			// This tells us if the object is in front of the character
			const dotProduct = facingDirection.dot(normalizedToObject);

			// If dot product is greater than the cosine of half the interaction angle,
			// the object is within our field of view
			return dotProduct > cosHalfAngle;
		};

		// Find an object intersection considering the extremely close case
		const findObjectIntersection = (
			intersects: THREE.Intersection[],
			targetName: string,
			extremelyClose: boolean
		): THREE.Intersection | undefined => {
			// If we're extremely close, we need a more lenient check
			if (extremelyClose) {
				// Find any intersection with the target name
				return intersects.find(intersect => {
					let current = intersect.object;
					while (current && !current.name && current.parent) {
						current = current.parent;
					}
					return current.name === targetName;
				});
			} else {
				// Standard case - find the first intersection with the target name
				return intersects.find(intersect => {
					let current = intersect.object;
					while (current && !current.name && current.parent) {
						current = current.parent;
					}
					return current.name === targetName;
				});
			}
		};

		// Handle spacebar interaction
		const handleInteraction = () => {
			checkInteraction();
		};

		// Set up key event listeners
		useEffect(() => {
			// Track key presses
			const handleKeyDown = (e: KeyboardEvent) => {
				keysPressed.current[e.key.toLowerCase()] = true;

				// Handle spacebar interaction
				if (e.code === 'Space') {
					handleInteraction();
					e.preventDefault();
				}
			};

			const handleKeyUp = (e: KeyboardEvent) => {
				keysPressed.current[e.key.toLowerCase()] = false;
			};

			window.addEventListener('keydown', handleKeyDown);
			window.addEventListener('keyup', handleKeyUp);

			return () => {
				window.removeEventListener('keydown', handleKeyDown);
				window.removeEventListener('keyup', handleKeyUp);
			};
		}, []);

		// Check if a position would collide with walls
		const checkCollision = (position: THREE.Vector3): boolean => {
			// Check rectangular wall collisions
			for (const wall of WALLS) {
				if (
					position.x + CHARACTER_RADIUS > wall.minX &&
					position.x - CHARACTER_RADIUS < wall.maxX &&
					position.z + CHARACTER_RADIUS > wall.minZ &&
					position.z - CHARACTER_RADIUS < wall.maxZ
				) {
					return true; // Collision detected
				}
			}

			// Check stargate collision (circular collision zone)
			const stargatePosition = new THREE.Vector3(0, 0, -9);
			const stargateRadius = 3;
			if (position.distanceTo(stargatePosition) < stargateRadius + CHARACTER_RADIUS) {
				return true; // Collision with stargate
			}

			// Check DHD collision
			const dhdPosition = new THREE.Vector3(8, 0, 0);
			const dhdRadius = 1.5;
			if (position.distanceTo(dhdPosition) < dhdRadius + CHARACTER_RADIUS) {
				return true; // Collision with DHD
			}

			return false; // No collision
		};

		// Update character position each frame based on keys pressed
		useFrame((state: RootState, delta: number) => {
			if (!characterRef.current) return;

			// Calculate movement direction
			const keys = keysPressed.current;
			const moveZ = (keys['w'] || keys['arrowup'] ? -1 : 0) + (keys['s'] || keys['arrowdown'] ? 1 : 0);
			const moveX = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);

			// Check if moving
			const moving = moveX !== 0 || moveZ !== 0;

			if (moving !== isMoving) {
				setIsMoving(moving);
			}

			// Move the character
			if (moving) {
				// Normalize for diagonal movement
				const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
				const normalizedX = moveX / length;
				const normalizedZ = moveZ / length;

				// Calculate the next position
				const nextPosition = characterRef.current.position.clone();
				nextPosition.x += normalizedX * speed;
				nextPosition.z += normalizedZ * speed;

				// Only update position if there's no collision
				if (!checkCollision(nextPosition)) {
					characterRef.current.position.copy(nextPosition);
				} else {
					// Try to slide along walls by moving in only one direction at a time
					const nextPositionX = characterRef.current.position.clone();
					nextPositionX.x += normalizedX * speed;

					const nextPositionZ = characterRef.current.position.clone();
					nextPositionZ.z += normalizedZ * speed;

					// Try moving only in X direction
					if (!checkCollision(nextPositionX)) {
						characterRef.current.position.copy(nextPositionX);
					}
					// Try moving only in Z direction
					else if (!checkCollision(nextPositionZ)) {
						characterRef.current.position.copy(nextPositionZ);
					}
				}

				// Face direction of movement
				const angle = Math.atan2(normalizedX, normalizedZ);
				characterRef.current.rotation.y = angle;

				// Increment animation time for bobbing effect
				animationTimeRef.current += delta * 10;
			}

			// Apply bobbing animation if moving
			if (isMoving) {
				// Simple bobbing up and down while moving
				const bobHeight = Math.sin(animationTimeRef.current) * 0.05;
				characterRef.current.position.y = 0.5 + bobHeight;
			} else {
				// Reset height when not moving
				characterRef.current.position.y = 0.5;
			}

			// Periodically check for interactive objects in front of the character
			lastInteractionCheckRef.current += delta;
			if (lastInteractionCheckRef.current > INTERACTION_CHECK_INTERVAL) {
				checkInteraction();
				lastInteractionCheckRef.current = 0;
			}
		});

		// Add a simple light attached to the character for better visibility
		return (
			<group>
				<mesh ref={characterRef} position={[0, 0.5, 0]}>
					{/* Simple character representation */}
					<capsuleGeometry args={[0.3, 1, 4, 8]} />
					<meshStandardMaterial color="#ff4f00" />
				</mesh>

				{/* Add a point light that follows the character */}
				<pointLight
					intensity={1}
					distance={5}
					color="#ff9966"
					position={[0, 2, 0]}
				/>
			</group>
		);
	}
);

export default CharacterController;
