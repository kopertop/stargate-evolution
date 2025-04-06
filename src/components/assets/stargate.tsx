import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateProps {
	position?: [number, number, number];
	isActive?: boolean;
	onActivate?: () => void;
	onActivationStageChange?: (stage: number) => void;
	noCollide?: boolean;
}

const Stargate: React.FC<StargateProps> = ({
	position = [0, 0, 0],
	isActive = false,
	onActivate = () => {},
	onActivationStageChange = () => {},
	noCollide = false
}) => {
	const eventHorizonRef = useRef<THREE.Mesh>(null);
	const chevronsRef = useRef<THREE.Group>(null);
	const [activationStage, setActivationStage] = useState(0); // 0: inactive, 1-3: activation stages, 4: fully active
	const [eventHorizonScale, setEventHorizonScale] = useState(0);
	const lastActiveState = useRef(isActive);
	const activationInProgressRef = useRef(false);
	const activationStartedRef = useRef(false);
	const activationIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const debugCounterRef = useRef(0); // For debugging

	// Add shutdown animation state
	const [isShuttingDown, setIsShuttingDown] = useState(false);
	const shutdownStartTimeRef = useRef(0);
	const shutdownDurationRef = useRef(2000); // Default 2 seconds

	// Listen for custom shutdown event
	useEffect(() => {
		const handleShutdown = (event: CustomEvent) => {
			console.log('Stargate shutdown event received');
			const duration = event.detail?.duration || 2000;
			console.log(`Shutdown duration: ${duration}ms`);
			setIsShuttingDown(true);
			shutdownStartTimeRef.current = Date.now() / 1000; // Use seconds for useFrame
			shutdownDurationRef.current = duration / 1000; // Convert ms to seconds
		};

		// Add event listener
		console.log('Adding stargate shutdown event listener');
		window.addEventListener('stargate-shutdown', handleShutdown as EventListener);

		// Cleanup
		return () => {
			console.log('Removing stargate shutdown event listener');
			window.removeEventListener('stargate-shutdown', handleShutdown as EventListener);
		};
	}, []);

	// Function to increment activation stage
	const incrementActivationStage = () => {
		setActivationStage(prev => {
			const newStage = Math.min(prev + 1, 4);
			console.log(`Stargate activation stage incremented to ${newStage} (from ${prev})`);

			if (newStage !== prev) {
				console.log(`Notifying parent of stage change: ${newStage}`);
				onActivationStageChange(newStage);

				// If we've reached the final stage, clear the interval
				if (newStage >= 4) {
					console.log('Stargate fully activated - clearing interval');
					if (activationIntervalRef.current) {
						clearInterval(activationIntervalRef.current);
						activationIntervalRef.current = null;
					}
					activationInProgressRef.current = false;
				}
			}

			return newStage;
		});
	};

	// Clear any existing intervals when component unmounts
	useEffect(() => {
		return () => {
			console.log('Stargate component unmounting - cleaning up intervals');
			if (activationIntervalRef.current) {
				clearInterval(activationIntervalRef.current);
				activationIntervalRef.current = null;
			}
		};
	}, []);

	// Handle activation stages based on isActive changes
	useEffect(() => {
		// This monitors the isActive prop for changes
		console.log(`isActive changed to: ${isActive}, lastActiveState: ${lastActiveState.current}, activationInProgress: ${activationInProgressRef.current}`);

		// Clean up any existing interval
		if (activationIntervalRef.current) {
			console.log('Clearing existing activation interval');
			clearInterval(activationIntervalRef.current);
			activationIntervalRef.current = null;
		}

		if (isActive && !lastActiveState.current) {
			// Starting the activation sequence
			console.log('Starting stargate activation sequence - fresh start');
			activationInProgressRef.current = true;
			activationStartedRef.current = true;
			debugCounterRef.current = 0;

			// Reset to stage 1
			setActivationStage(1);
			onActivationStageChange(1);

			// Reset shutdown state when activating
			setIsShuttingDown(false);

			// Create a new interval for the chevron activation sequence
			console.log('Setting up activation interval...');
			activationIntervalRef.current = setInterval(() => {
				debugCounterRef.current += 1;
				console.log(`Activation interval tick ${debugCounterRef.current}`);
				incrementActivationStage();
			}, 800); // Each chevron group lights up with a delay
		}
		else if (!isActive && lastActiveState.current) {
			// Only deactivate immediately if not in shutdown mode
			if (!isShuttingDown) {
				console.log('Deactivating stargate immediately');
				setActivationStage(0);
				onActivationStageChange(0);
				setEventHorizonScale(0);
				activationInProgressRef.current = false;
				activationStartedRef.current = false;
			}
		}

		lastActiveState.current = isActive;
	}, [isActive, isShuttingDown, onActivationStageChange]);

	// Process the shutdown animation
	useEffect(() => {
		if (isShuttingDown && activationStage > 0) {
			console.log('Starting shutdown animation');

			const shutdownInterval = setInterval(() => {
				setEventHorizonScale(prev => Math.max(0, prev - 0.05));

				// Only reduce activation stage when event horizon is small enough
				if (eventHorizonScale < 0.3) {
					setActivationStage(prev => {
						const newStage = Math.max(0, prev - 1);
						console.log(`Shutdown: Activation stage changed to ${newStage}`);

						if (newStage !== prev) {
							onActivationStageChange(newStage);
						}

						// When fully deactivated, reset the shutdown state
						if (newStage === 0) {
							setIsShuttingDown(false);
							activationStartedRef.current = false;
							console.log('Stargate shutdown complete');
							clearInterval(shutdownInterval);
						}

						return newStage;
					});
				}
			}, 200);

			return () => clearInterval(shutdownInterval);
		}
	}, [isShuttingDown, activationStage, eventHorizonScale, onActivationStageChange]);

	useFrame((state, delta) => {
		// Event horizon animation
		if (eventHorizonRef.current) {
			const material = eventHorizonRef.current.material as THREE.MeshStandardMaterial;

			// Shutdown animation
			if (isShuttingDown) {
				// Calculate progress (0 to 1)
				const time = state.clock.getElapsedTime() - shutdownStartTimeRef.current;
				const duration = shutdownDurationRef.current;
				const progress = Math.min(1, time / duration);

				// Slower shutdown with animation
				const ease = 1 - Math.pow(1 - progress, 1.5); // Slower at the end for more dramatic effect

				// Shrink the event horizon
				const scale = Math.max(0, 1 - ease);
				eventHorizonRef.current.scale.set(scale, scale, 1);

				// Reduce opacity while increasing glow for dramatic effect
				material.opacity = Math.max(0, 0.8 - ease * 0.8);
				material.emissiveIntensity = 0.8 + (1 - scale) * 0.5; // Increase glow as it shrinks

				// Add some rotation to the event horizon during shutdown
				eventHorizonRef.current.rotation.z += delta * (0.5 + ease * 2);

				// Handle completion of shutdown animation
				if (progress >= 1) {
					console.log('Shutdown animation completed');
					// Reset everything
					setActivationStage(0);
					onActivationStageChange(0);
					setEventHorizonScale(0);
					setIsShuttingDown(false);
					activationStartedRef.current = false;
					eventHorizonRef.current.scale.set(0, 0, 1);
					material.opacity = 0;
				}
			} else {
				// Handle different activation stages
				if (activationStage < 3) {
					// Not fully active yet, keep the event horizon invisible or small
					material.opacity = 0;
					eventHorizonRef.current.scale.set(0, 0, 1);
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
						onActivationStageChange(4);
					}
				} else if (activationStage === 4) {
					// Fully active, animate the event horizon
					eventHorizonRef.current.rotation.z += delta * 0.5;

					// Subtle watery ripple effect
					material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
					material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;

					// Ensure the scale is correct
					eventHorizonRef.current.scale.set(1, 1, 1);
				}
			}
		}

		// Chevron animations
		if (chevronsRef.current) {
			chevronsRef.current.children.forEach((chevron, i) => {
				const material = (chevron as THREE.Mesh).material as THREE.MeshStandardMaterial;

				// If shutting down
				if (isShuttingDown) {
					const chevronIndex = chevronsRef.current!.children.length - 1 - i;

					// Calculate progress for this chevron (0 to 1)
					const time = state.clock.getElapsedTime() - shutdownStartTimeRef.current;
					const progress = Math.min(1, time / 3);
					const threshold = chevronIndex * 0.1; // Stagger the shutdown

					if (progress > threshold) {
						// Enhanced shutdown pulse effect
						const pulseSpeed = 10 + chevronIndex * 0.5;
						const pulseOffset = state.clock.getElapsedTime() * pulseSpeed;

						// Dramatic pulsing during shutdown
						const pulseFactor = Math.sin(pulseOffset) * 0.7;
						material.emissiveIntensity = Math.max(0, 1.5 - progress * 2) + pulseFactor;

						// Color shift from orange to red as it shuts down
						const hue = Math.max(0, 0.08 - progress * 0.08); // 0.08 is orange-red, 0 is red
						material.emissive.setHSL(hue, 1, 0.5);
						material.color.setHSL(hue, 1, 0.6);

						// Dramatic scale pulsing during shutdown
						const scale = 1 + pulseFactor * 0.2;
						chevron.scale.set(scale, scale, scale);
					}
				} else {
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
						// Enhanced pulse effect for better visibility
						const pulseSpeed = 3 + i * 0.3; // Varied pulse speed for each chevron
						const pulseOffset = state.clock.getElapsedTime() * pulseSpeed + i * 0.7;

						// Stronger pulse with higher base value
						material.emissiveIntensity = 1.2 + Math.sin(pulseOffset) * 0.4;
						material.emissive.set("#ff5500"); // Brighter orange-red
						material.color.set("#ff7700"); // Brighter orange

						// Scale the chevron slightly to add another visual cue
						const scale = 1 + Math.sin(pulseOffset) * 0.1;
						chevron.scale.set(scale, scale, scale);
					} else {
						material.emissiveIntensity = 0;
						material.emissive.set("#000000");
						material.color.set("#cc3300");

						// Reset scale
						chevron.scale.set(1, 1, 1);
					}
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
