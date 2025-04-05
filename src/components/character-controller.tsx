import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame, RootState } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterControllerProps {
	speed?: number;
}

const CharacterController = forwardRef<THREE.Mesh, CharacterControllerProps>(
	({ speed = 0.05 }, ref) => {
		const characterRef = useRef<THREE.Mesh>(null!);
		const keysPressed = useRef<Record<string, boolean>>({});

		// Expose the internal mesh ref to parent components via forwarded ref
		useImperativeHandle(ref, () => characterRef.current);

		// Set up key event listeners
		useEffect(() => {
			// Track key presses
			const handleKeyDown = (e: KeyboardEvent) => {
				keysPressed.current[e.key.toLowerCase()] = true;
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

		// Update character position each frame based on keys pressed
		useFrame((state: RootState, delta: number) => {
			if (!characterRef.current) return;

			// Calculate movement direction
			const keys = keysPressed.current;
			const moveZ = (keys['w'] || keys['arrowup'] ? -1 : 0) + (keys['s'] || keys['arrowdown'] ? 1 : 0);
			const moveX = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);

			// Move the character
			if (moveX !== 0 || moveZ !== 0) {
				// Normalize for diagonal movement
				const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
				const normalizedX = moveX / length;
				const normalizedZ = moveZ / length;

				// Update position
				characterRef.current.position.x += normalizedX * speed;
				characterRef.current.position.z += normalizedZ * speed;

				// Face direction of movement
				if (moveX !== 0 || moveZ !== 0) {
					const angle = Math.atan2(normalizedX, normalizedZ);
					characterRef.current.rotation.y = angle;
				}
			}
		});

		return (
			<mesh ref={characterRef} position={[0, 0.5, 0]}>
				{/* Simple character representation */}
				<capsuleGeometry args={[0.3, 1, 4, 8]} />
				<meshStandardMaterial color="#ff4f00" />
			</mesh>
		);
	}
);

export default CharacterController;
