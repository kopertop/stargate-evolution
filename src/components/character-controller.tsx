import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useFrame, RootState, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/use-keyboard';

interface CharacterControllerProps {
	speed?: number;
	onInteract?: (target: THREE.Object3D | null) => void;
	interactionRadius?: number; // How close the player needs to be to interact
	interactionAngle?: number; // Field of view angle for interaction (in degrees)
	ignoreObjects?: string[]; // Names of objects that shouldn't block movement
	allowCameraRotation?: boolean; // Flag to enable/disable camera rotation
}

// Define wall boundaries as rectangular zones
const WALLS = [
	// Back wall
	{ minX: -10, maxX: 10, minZ: -10.25, maxZ: -9.75 },
	// Left wall
	{ minX: -10.25, maxX: -9.75, minZ: -10, maxZ: 10 },
	// Right wall
	{ minX: 9.75, maxX: 10.25, minZ: -10, maxZ: 10 },
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

const CharacterController = forwardRef<THREE.Group, CharacterControllerProps>(
	({
		speed = 0.12,
		onInteract = () => {},
		interactionRadius = 3.5, // Default interaction radius
		interactionAngle = 60,    // Default field of view angle in degrees
		ignoreObjects = [],       // Default to empty list
		allowCameraRotation = false // Default to no camera rotation
	}, ref) => {
		const groupRef = useRef<THREE.Group>(null!);
		const keysPressed = useRef<Record<string, boolean>>({});
		const [isMoving, setIsMoving] = useState(false);
		const animationTimeRef = useRef(0);
		const { scene, camera } = useThree();
		const raycaster = useRef(new THREE.Raycaster());
		const lookDirection = useRef(new THREE.Vector3(0, 0, -1));
		const [nearbyObject, setNearbyObject] = useState<THREE.Object3D | null>(null);
		const [isLookingAtObject, setIsLookingAtObject] = useState(false);
		const keyboard = useKeyboard();

		// Camera control references
		const cameraRotationRef = useRef(0);
		const targetRotationRef = useRef(0);
		const mouseMoveRef = useRef({ x: 0, y: 0 });
		const isRotatingRef = useRef(false);

		// Keep track of the last frame we checked for interactions
		const lastInteractionCheckRef = useRef(0);
		// How often to check for interactions (in seconds)
		const INTERACTION_CHECK_INTERVAL = 0.1;

		// Forward the ref to the parent component
		useImperativeHandle(ref, () => groupRef.current);

		// Handle mouse movement for camera rotation
		useEffect(() => {
			if (!allowCameraRotation) return;

			const handleMouseDown = (e: MouseEvent) => {
				// Only start rotation on right mouse button
				if (e.button === 2) {
					isRotatingRef.current = true;
					mouseMoveRef.current = { x: e.clientX, y: e.clientY };
				}
			};

			const handleMouseUp = (e: MouseEvent) => {
				// Stop rotation on mouse button release
				if (e.button === 2) {
					isRotatingRef.current = false;
				}
			};

			const handleMouseMove = (e: MouseEvent) => {
				if (isRotatingRef.current) {
					// Calculate mouse delta
					const deltaX = e.clientX - mouseMoveRef.current.x;
					mouseMoveRef.current = { x: e.clientX, y: e.clientY };

					// Update target rotation based on mouse movement
					// Negative to make movement direction feel natural
					targetRotationRef.current -= deltaX * 0.01;
				}
			};

			// Prevent context menu on right-click for rotation
			const preventContextMenu = (e: MouseEvent) => {
				e.preventDefault();
			};

			// Set up event listeners
			window.addEventListener('mousedown', handleMouseDown);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('contextmenu', preventContextMenu);

			return () => {
				window.removeEventListener('mousedown', handleMouseDown);
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('contextmenu', preventContextMenu);
			};
		}, [allowCameraRotation]);

		// Check what's in front of the character
		const checkInteraction = () => {
			if (!groupRef.current) return;

			// Get character position and facing direction
			const characterPosition = groupRef.current.position.clone();
			const facingDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRef.current.quaternion);
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

			// Update whether we're looking at an object
			setIsLookingAtObject(closestObject !== null);
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

		// Consolidate all key event listeners
		useEffect(() => {
			// Track key presses for WASD movement
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

		// Check if a position would collide with walls or objects
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

			// Search for objects with collision in the scene
			const collidableObjects: THREE.Object3D[] = [];

			// Collect all meshes in the scene to check for collision
			scene.traverse((object) => {
				// Skip the character itself
				if (object === groupRef.current || groupRef.current.children.includes(object)) {
					return;
				}

				// Skip objects that should be ignored
				if (object.name && ignoreObjects.includes(object.name)) {
					return;
				}

				// Skip objects with userData.noCollide flag
				if (object.userData && object.userData.noCollide === true) {
					return;
				}

				// Add mesh objects for collision check
				if (object instanceof THREE.Mesh) {
					// Check for specific objects we know about
					if (object.name === 'stargate' && ignoreObjects.includes('stargate')) {
						return;
					}
					if (object.name === 'dhd' && ignoreObjects.includes('dhd')) {
						return;
					}

					collidableObjects.push(object);
				}
			});

			// Use raycasting in multiple directions to check for collisions
			const directions = [
				new THREE.Vector3(1, 0, 0),
				new THREE.Vector3(-1, 0, 0),
				new THREE.Vector3(0, 0, 1),
				new THREE.Vector3(0, 0, -1),
				new THREE.Vector3(0.7, 0, 0.7),
				new THREE.Vector3(0.7, 0, -0.7),
				new THREE.Vector3(-0.7, 0, 0.7),
				new THREE.Vector3(-0.7, 0, -0.7)
			];

			// Current position of the character
			const currentPosition = groupRef.current.position.clone();

			// Movement vector
			const moveVector = position.clone().sub(currentPosition);
			const moveDistance = moveVector.length();

			// Only check if we're actually moving
			if (moveDistance > 0.001) {
				// Check objects directly in our path by raycasting
				raycaster.current.set(currentPosition, moveVector.normalize());
				raycaster.current.far = moveDistance + CHARACTER_RADIUS;
				const intersects = raycaster.current.intersectObjects(collidableObjects, true);

				if (intersects.length > 0) {
					return true; // Collision with an object
				}
			}

			return false; // No collision detected
		};

		// Update character position each frame based on keys pressed
		useFrame((state: RootState, delta: number) => {
			if (!groupRef.current) return;

			// Get the current camera rotation from userData (if set by stargate travel)
			const currentCameraRotation = groupRef.current.userData.cameraRotation || 0;

			// Apply camera rotation if enabled
			if (allowCameraRotation) {
				// Check for Q and E keys in keyboard hook (more reliable than keysPressed)
				if (keyboard.keys.has('KeyQ')) {
					targetRotationRef.current += delta * 2; // Smoother rotation left
				}
				if (keyboard.keys.has('KeyE')) {
					targetRotationRef.current -= delta * 2; // Smoother rotation right
				}

				// Make rotation more responsive by using a higher lerp factor
				cameraRotationRef.current = THREE.MathUtils.lerp(
					cameraRotationRef.current,
					targetRotationRef.current,
					delta * 10 // Increased from 5 to 10 for faster response
				);

				// Always update the camera rotation, combining existing rotation from stargate travel
				// with manual rotation input
				groupRef.current.userData.cameraRotation = cameraRotationRef.current +
					(groupRef.current.userData.stargateRotation || 0);
			}

			// Calculate movement direction
			const moveZ = (keyboard.keys.has('KeyW') || keyboard.keys.has('ArrowUp') ? -1 : 0) +
						  (keyboard.keys.has('KeyS') || keyboard.keys.has('ArrowDown') ? 1 : 0);

			const moveX = (keyboard.keys.has('KeyA') || keyboard.keys.has('ArrowLeft') ? -1 : 0) +
						  (keyboard.keys.has('KeyD') || keyboard.keys.has('ArrowRight') ? 1 : 0);

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

				// Apply camera rotation to movement direction
				let rotatedX = normalizedX;
				let rotatedZ = normalizedZ;

				if (allowCameraRotation || currentCameraRotation !== 0) {
					// Apply current camera rotation to movement direction
					const cos = Math.cos(currentCameraRotation);
					const sin = Math.sin(currentCameraRotation);
					rotatedX = normalizedX * cos - normalizedZ * sin;
					rotatedZ = normalizedX * sin + normalizedZ * cos;
				}

				// Calculate the next position
				const nextPosition = groupRef.current.position.clone();
				nextPosition.x += rotatedX * speed;
				nextPosition.z += rotatedZ * speed;

				// Only update position if there's no collision
				if (!checkCollision(nextPosition)) {
					groupRef.current.position.copy(nextPosition);
				} else {
					// Try to slide along walls by moving in only one direction at a time
					const nextPositionX = groupRef.current.position.clone();
					nextPositionX.x += rotatedX * speed;

					const nextPositionZ = groupRef.current.position.clone();
					nextPositionZ.z += rotatedZ * speed;

					// Try moving only in X direction
					if (!checkCollision(nextPositionX)) {
						groupRef.current.position.copy(nextPositionX);
					}
					// Try moving only in Z direction
					else if (!checkCollision(nextPositionZ)) {
						groupRef.current.position.copy(nextPositionZ);
					}
				}

				// Face direction of movement
				const angle = Math.atan2(rotatedX, rotatedZ);
				groupRef.current.rotation.y = angle;

				// Increment animation time for bobbing effect
				animationTimeRef.current += delta * 10;
			}

			// Apply bobbing animation if moving
			if (isMoving) {
				// Simple bobbing up and down while moving
				const bobHeight = Math.sin(animationTimeRef.current) * 0.05;
				groupRef.current.position.y = 0.5 + bobHeight;
			} else {
				// Reset height when not moving
				groupRef.current.position.y = 0.5;
			}

			// Periodically check for interactive objects in front of the character
			lastInteractionCheckRef.current += delta;
			if (lastInteractionCheckRef.current > INTERACTION_CHECK_INTERVAL) {
				checkInteraction();
				lastInteractionCheckRef.current = 0;
			}
		});

		return (
			<group ref={groupRef} position={[0, 0.5, 0]}>
				{/* Character body */}
				<mesh>
					<capsuleGeometry args={[0.3, 1, 4, 8]} />
					<meshStandardMaterial color="#ff4f00" />
				</mesh>

				{/* Direction indicator attached to character (cone pointing forward) */}
				<mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
					<coneGeometry args={[0.2, 0.5, 8]} />
					<meshStandardMaterial
						color={isLookingAtObject ? "#ffaa00" : "#66ccff"}
						emissive={isLookingAtObject ? "#ff6600" : "#0066ff"}
						emissiveIntensity={0.5}
					/>
				</mesh>

				{/* Add a point light that follows the character */}
				<pointLight
					intensity={1}
					distance={5}
					color="#ff9966"
				/>
			</group>
		);
	}
);

export default CharacterController;
