import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateProps {
	position?: [number, number, number];
	isActive: boolean;
	activationStage: number; // 0: inactive, 1-8: activation stages
	isShuttingDown?: boolean;
	noCollide?: boolean;
	onActivationStageChange?: (stage: number) => void;
}

const Stargate: React.FC<StargateProps> = ({
	position = [0, 0, 0],
	isActive,
	activationStage,
	isShuttingDown = false,
	noCollide = false,
	onActivationStageChange = () => {}
}) => {
	const eventHorizonRef = useRef<THREE.Mesh>(null);
	const chevronsRef = useRef<THREE.Group>(null);
	const eventHorizonScaleRef = useRef(0);
	const shutdownStartTimeRef = useRef(0);
	const shutdownDurationRef = useRef(2); // Duration in seconds

	// Define chevron activation order (left to right across the top, excluding bottom two)
	// Using angles to identify the chevrons: 0 is top, increasing clockwise
	const chevronActivationOrder = [6, 7, 8, 0, 1, 2, 3]; // Indices in the circular arrangement

	// If shutting down, store the start time
	if (isShuttingDown && shutdownStartTimeRef.current === 0) {
		shutdownStartTimeRef.current = Date.now() / 1000; // Use seconds for useFrame
	} else if (!isShuttingDown) {
		shutdownStartTimeRef.current = 0;
	}

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
				eventHorizonScaleRef.current = scale;

				// Reduce opacity while increasing glow for dramatic effect
				material.opacity = Math.max(0, 0.8 - ease * 0.8);
				material.emissiveIntensity = 0.8 + (1 - scale) * 0.5; // Increase glow as it shrinks

				// Add some rotation to the event horizon during shutdown
				eventHorizonRef.current.rotation.z += delta * (0.5 + ease * 2);
			} else {
				// Handle different activation stages
				if (activationStage < 7) {
					// Not fully active yet, keep the event horizon invisible or small
					material.opacity = 0;
					eventHorizonRef.current.scale.set(0, 0, 1);
					eventHorizonScaleRef.current = 0;
				} else if (activationStage === 7) {
					// Whoosh effect - rapidly forming event horizon
					eventHorizonScaleRef.current = Math.min(eventHorizonScaleRef.current + delta * 4, 1);

					eventHorizonRef.current.scale.set(
						eventHorizonScaleRef.current,
						eventHorizonScaleRef.current,
						1
					);
					material.opacity = eventHorizonScaleRef.current * 0.9;

					// When fully formed, notify parent
					if (eventHorizonScaleRef.current >= 0.99) {
						onActivationStageChange(8);
					}
				} else if (activationStage === 8) {
					// Fully active, animate the event horizon
					eventHorizonRef.current.rotation.z += delta * 0.5;

					// Subtle watery ripple effect
					material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
					material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;

					// Ensure the scale is correct
					eventHorizonRef.current.scale.set(1, 1, 1);
					eventHorizonScaleRef.current = 1;
				}
			}
		}

		// Chevron animations
		if (chevronsRef.current) {
			chevronsRef.current.children.forEach((chevron, i) => {
				const material = (chevron as THREE.Mesh).material as THREE.MeshStandardMaterial;

				// If shutting down
				if (isShuttingDown) {
					const chevronIndex = chevronActivationOrder.indexOf(i);
					if (chevronIndex === -1) return; // Skip non-activating chevrons (the bottom two)

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
					// Check if this chevron is part of the activation sequence
					const chevronActivationIndex = chevronActivationOrder.indexOf(i);

					// Determine if this chevron should be lit based on new activation order
					const shouldBeLit = isActive &&
						chevronActivationIndex !== -1 && // Only light up chevrons in our activation order
						activationStage > chevronActivationIndex; // Light based on position in activation sequence

					// Update chevron appearance
					if (shouldBeLit) {
						// Enhanced pulse effect for better visibility
						const pulseSpeed = 3 + chevronActivationIndex * 0.3; // Varied pulse speed for each chevron
						const pulseOffset = state.clock.getElapsedTime() * pulseSpeed + chevronActivationIndex * 0.7;

						// Stronger pulse with higher base value
						material.emissiveIntensity = 1.2 + Math.sin(pulseOffset) * 0.4;
						material.emissive.set('#ff5500'); // Brighter orange-red
						material.color.set('#ff7700'); // Brighter orange

						// Scale the chevron slightly to add another visual cue
						const scale = 1 + Math.sin(pulseOffset) * 0.1;
						chevron.scale.set(scale, scale, scale);
					} else {
						material.emissiveIntensity = 0;
						material.emissive.set('#000000');
						material.color.set('#cc3300');

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
