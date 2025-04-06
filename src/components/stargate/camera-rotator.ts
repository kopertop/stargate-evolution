import * as THREE from 'three';

/**
 * Rotates the character to look around after arriving through the stargate
 * @param characterRef Reference to the character group
 * @param onComplete Optional callback when rotation completes
 */
export const rotateCamera = (
	characterRef: React.RefObject<THREE.Group | null>,
	onComplete?: () => void
) => {
	if (!characterRef.current) return;

	// Set up rotation animation
	let startTime = performance.now();
	const duration = 1200; // 1.2 seconds for the rotation
	const initialRotation = 0; // Start at 0
	const targetRotation = Math.PI; // Rotate 180 degrees (PI radians)

	// Animation function
	const animateRotation = () => {
		const now = performance.now();
		const elapsed = now - startTime;
		const progress = Math.min(elapsed / duration, 1);

		// Use easeInOut function for smooth rotation
		const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
		const easedProgress = easeInOut(progress);

		if (characterRef.current) {
			// Rotate the character
			characterRef.current.rotation.y = initialRotation + targetRotation * easedProgress;

			// Store the stargate-induced rotation in a separate property
			characterRef.current.userData.stargateRotation = -targetRotation * easedProgress;

			// Update the camera rotation (this will be combined with manual rotation in the character controller)
			characterRef.current.userData.cameraRotation = characterRef.current.userData.stargateRotation;
		}

		if (progress < 1) {
			requestAnimationFrame(animateRotation);
		} else {
			// Ensure final rotation is exactly 180 degrees
			if (characterRef.current) {
				characterRef.current.rotation.y = targetRotation;
				characterRef.current.userData.stargateRotation = -targetRotation;
				characterRef.current.userData.cameraRotation = characterRef.current.userData.stargateRotation;
			}

			// Notify completion
			if (onComplete) {
				setTimeout(onComplete, 300);
			}
		}
	};

	// Start the rotation animation
	requestAnimationFrame(animateRotation);
};
