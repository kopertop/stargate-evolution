import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateProps {
	position?: [number, number, number];
	isActive?: boolean;
	onActivate?: () => void;
	noCollide?: boolean;
}

const Stargate: React.FC<StargateProps> = ({
	position = [0, 0, 0],
	isActive = false,
	onActivate = () => {},
	noCollide = false
}) => {
	const eventHorizonRef = useRef<THREE.Mesh>(null);
	const chevronsRef = useRef<THREE.Group>(null);
	const [activationStage, setActivationStage] = useState(0); // 0: inactive, 1-3: activation stages, 4: fully active
	const [eventHorizonScale, setEventHorizonScale] = useState(0);
	const lastActiveState = useRef(isActive);

	// Add shutdown animation state
	const [isShuttingDown, setIsShuttingDown] = useState(false);
	const shutdownStartTimeRef = useRef(0);
	const shutdownDurationRef = useRef(2000); // Default 2 seconds

	// Handle activation stages
	useEffect(() => {
		if (isActive && !lastActiveState.current) {
			// Starting the activation sequence
			setActivationStage(1);
			// Reset shutdown state when activating
			setIsShuttingDown(false);

			// Chevrons lighting up
			const chevronInterval = setInterval(() => {
				setActivationStage(prev => {
					if (prev < 4) return prev + 1;
					clearInterval(chevronInterval);
					return prev;
				});
			}, 800); // Each chevron group lights up with a delay

			return () => clearInterval(chevronInterval);
		} else if (!isActive && lastActiveState.current) {
			// Only deactivate immediately if not in shutdown mode
			if (!isShuttingDown) {
				setActivationStage(0);
				setEventHorizonScale(0);
			}
		}

		lastActiveState.current = isActive;
	}, [isActive, isShuttingDown]);

	// Listen for shutdown event
	useEffect(() => {
		const handleShutdown = (event: Event) => {
			if (isActive) {
				console.log('Stargate shutdown initiated');
				setIsShuttingDown(true);
				shutdownStartTimeRef.current = performance.now();
				// Get duration from custom event or use default
				const customEvent = event as CustomEvent;
				shutdownDurationRef.current = customEvent.detail?.duration || 2000;
			}
		};

		// Add event listener with type assertion
		document.body.addEventListener('stargate-shutdown',
			handleShutdown as EventListener);

		return () => {
			document.body.removeEventListener('stargate-shutdown',
				handleShutdown as EventListener);
		};
	}, [isActive]);

	// Animation for the event horizon and chevrons
	useFrame((state, delta) => {
		// Handle shutdown animation
		if (isShuttingDown && isActive) {
			const elapsed = performance.now() - shutdownStartTimeRef.current;
			const progress = Math.min(elapsed / shutdownDurationRef.current, 1);

			// Reverse animation for shutdown - ease out function
			const reverseProgress = 1 - Math.pow(progress, 2);

			if (eventHorizonRef.current) {
				// Shrink the event horizon
				eventHorizonRef.current.scale.set(reverseProgress, reverseProgress, 1);

				// Fade out the opacity
				const material = eventHorizonRef.current.material as THREE.MeshStandardMaterial;
				material.opacity = reverseProgress * 0.7;
				material.emissiveIntensity = reverseProgress * 0.5;
			}

			// Turn off chevrons in reverse order
			if (chevronsRef.current && progress > 0.5) {
				// Start turning off chevrons halfway through the animation
				const chevronProgress = (progress - 0.5) * 2; // rescale from 0-1
				const activeChevrons = Math.floor(9 * (1 - chevronProgress));

				chevronsRef.current.children.forEach((chevron, i) => {
					const material = (chevron as THREE.Mesh).material as THREE.MeshStandardMaterial;

					// Gradually turn off chevrons in reverse order
					if (i >= activeChevrons) {
						material.emissiveIntensity = 0;
						material.emissive.set("#000000");
						material.color.set("#cc3300");
					}
				});
			}

			// When shutdown is complete
			if (progress === 1) {
				setIsShuttingDown(false);
				setActivationStage(0);
				setEventHorizonScale(0);
			}

			return; // Skip regular animation during shutdown
		}

		// Regular event horizon animations
		if (eventHorizonRef.current) {
			const material = eventHorizonRef.current.material as THREE.MeshStandardMaterial;

			// Handle different activation stages
			if (activationStage < 3) {
				// Not fully active yet, keep the event horizon invisible or small
				material.opacity = 0;
				eventHorizonRef.current.scale.set(eventHorizonScale, eventHorizonScale, 1);
			} else if (activationStage === 3) {
				// Whoosh effect - rapidly forming event horizon
				setEventHorizonScale(prev => {
					const newScale = prev + delta * 4; // Grow rapidly
					return Math.min(newScale, 1); // Cap at full size
				});

				eventHorizonRef.current.scale.set(eventHorizonScale, eventHorizonScale, 1);
				material.opacity = eventHorizonScale * 0.9;

				// When fully formed, move to final stage
				if (eventHorizonScale >= 0.99) {
					setActivationStage(4);
				}
			} else if (activationStage === 4) {
				// Fully active, animate the event horizon
				eventHorizonRef.current.rotation.z += delta * 0.5;

				// Subtle watery ripple effect
				material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
				material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
			}
		}

		// Chevron animations
		if (chevronsRef.current) {
			chevronsRef.current.children.forEach((chevron, i) => {
				const material = (chevron as THREE.Mesh).material as THREE.MeshStandardMaterial;

				// Determine if this chevron should be lit
				const shouldBeLit = isActive && (
					// Stage 1: First 3 chevrons
					(activationStage >= 1 && i < 3) ||
					// Stage 2: Next 3 chevrons
					(activationStage >= 2 && i >= 3 && i < 6) ||
					// Stage 3+: Last 3 chevrons
					(activationStage >= 3 && i >= 6)
				);

				// Update chevron appearance
				if (shouldBeLit) {
					material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2;
					material.emissive.set("#ff3300");
					material.color.set("#ff6600");
				} else {
					material.emissiveIntensity = 0;
					material.emissive.set("#000000");
					material.color.set("#cc3300");
				}
			});
		}
	});

	return (
		<group position={position} name="stargate">
			{/* Outer ring */}
			<mesh>
				<torusGeometry args={[3, 0.5, 16, 32]} />
				<meshStandardMaterial color="#444444" />
			</mesh>

			{/* Inner part (event horizon) - Initially invisible */}
			<mesh
				ref={eventHorizonRef}
				userData={{ noCollide: noCollide }}
				scale={[0, 0, 1]} // Start with zero scale
			>
				<circleGeometry args={[2.5, 32]} />
				<meshStandardMaterial
					color="#66ccff"
					emissive="#00aaff"
					emissiveIntensity={0.5}
					transparent={true}
					opacity={0}
				/>
			</mesh>

			{/* Chevrons */}
			<group ref={chevronsRef}>
				{Array.from({ length: 9 }).map((_, i) => {
					const angle = (i * (360 / 9) * Math.PI) / 180;
					return (
						<mesh
							key={`chevron-${i}`}
							position={[
								Math.sin(angle) * 3.2,
								Math.cos(angle) * 3.2,
								0.5
							]}
							rotation={[0, 0, -angle - Math.PI / 2]}
						>
							<coneGeometry args={[0.4, 0.6, 3]} />
							<meshStandardMaterial
								color="#cc3300"
								emissive="#000000"
								emissiveIntensity={0}
							/>
						</mesh>
					);
				})}
			</group>
		</group>
	);
};

export default Stargate;
