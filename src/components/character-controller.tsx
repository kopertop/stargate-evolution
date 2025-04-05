import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useFrame, RootState, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterControllerProps {
	speed?: number;
	onInteract?: (target: THREE.Object3D | null) => void;
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
// Interaction range
const INTERACTION_RANGE = 3;

const CharacterController = forwardRef<THREE.Mesh, CharacterControllerProps>(
	({ speed = 0.12, onInteract = () => {} }, ref) => {
		const characterRef = useRef<THREE.Mesh>(null!);
		const keysPressed = useRef<Record<string, boolean>>({});
		const [isMoving, setIsMoving] = useState(false);
		const animationTimeRef = useRef(0);
		const { scene } = useThree();
		const raycaster = useRef(new THREE.Raycaster());
		const lookDirection = useRef(new THREE.Vector3(0, 0, -1));

		// Expose the internal mesh ref to parent components via forwarded ref
		useImperativeHandle(ref, () => characterRef.current);

		// Handle spacebar interaction
		const handleInteraction = () => {
			if (!characterRef.current) return;

			// Update raycaster position and direction
			const position = characterRef.current.position.clone();
			// Adjust y position to be at the "head" level
			position.y = 1.0;

			// Use character's facing direction for the ray
			const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(characterRef.current.quaternion);
			lookDirection.current = facing;

			raycaster.current.set(position, facing);

			// Find intersections with scene objects
			const intersects = raycaster.current.intersectObjects(scene.children, true);

			// Filter for interactive objects within range
			const interactiveObject = intersects.find(intersect =>
				intersect.distance < INTERACTION_RANGE &&
				(intersect.object.parent?.name === 'dhd' ||
				 intersect.object.parent?.name === 'stargate')
			);

			if (interactiveObject) {
				onInteract(interactiveObject.object);
			} else {
				onInteract(null);
			}
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
