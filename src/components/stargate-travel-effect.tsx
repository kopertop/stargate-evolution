import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateWormholeEffectProps {
	active: boolean;
	onComplete: () => void;
	duration?: number; // Duration in milliseconds
}

const StargateWormholeEffect: React.FC<StargateWormholeEffectProps> = ({
	active,
	onComplete,
	duration = 3000 // Default duration 3 seconds
}) => {
	const pointsRef = useRef<THREE.Points>(null);
	const progressRef = useRef(0); // 0 to 1
	const isActiveRef = useRef(false); // Track internal active state

	const numPoints = 5000;

	// Create particle positions
	const particles = useMemo(() => {
		const positions = new Float32Array(numPoints * 3);
		const scales = new Float32Array(numPoints);
		const colors = new Float32Array(numPoints * 3);
		const color = new THREE.Color();

		for (let i = 0; i < numPoints; i++) {
			const i3 = i * 3;
			const radius = Math.random() * 10 + 2; // Spread farther out
			const theta = Math.random() * Math.PI * 2;
			const z = (Math.random() - 0.5) * 100; // Spread along Z axis

			positions[i3] = Math.cos(theta) * radius;
			positions[i3 + 1] = Math.sin(theta) * radius;
			positions[i3 + 2] = z;

			scales[i] = Math.random() * 0.5 + 0.1; // Varying square sizes

			// White squares
			color.set('#ffffff');
			colors[i3] = color.r;
			colors[i3 + 1] = color.g;
			colors[i3 + 2] = color.b;
		}
		return { positions, scales, colors };
	}, [numPoints]);

	// Animate particles
	useFrame((state, delta) => {
		if (!pointsRef.current) return;

		const geom = pointsRef.current.geometry;
		const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;

		if (isActiveRef.current) {
			// Increase progress
			progressRef.current = Math.min(progressRef.current + delta * (1000 / duration), 1);

			// Animate Z position and scale
			for (let i = 0; i < numPoints; i++) {
				const i3 = i * 3;
				// Move particles towards camera
				posAttr.array[i3 + 2] += delta * (50 + Math.random() * 50); // Speed variation

				// Reset particle if it goes past the camera
				if (posAttr.array[i3 + 2] > 10) {
					posAttr.array[i3 + 2] = -50 - Math.random() * 50; // Reset behind
				}
			}
			posAttr.needsUpdate = true;

			// Rotate the whole system slowly
			pointsRef.current.rotation.z += delta * 0.1;

		} else {
			// Decrease progress when inactive
			progressRef.current = Math.max(progressRef.current - delta * (1000 / duration) * 2, 0); // Fade out faster
		}

		// Control visibility based on progress
		const material = pointsRef.current.material as THREE.PointsMaterial;
		material.opacity = progressRef.current;
		material.visible = progressRef.current > 0.01;
	});

	// Handle activation/deactivation side effects
	useEffect(() => {
		if (active) {
			console.log('StargateWormholeEffect activated');
			// If starting fresh, reset progress
			if (!isActiveRef.current) {
				progressRef.current = 0;
			}
			isActiveRef.current = true;
		} else {
			console.log('StargateWormholeEffect deactivated');
			isActiveRef.current = false;
			// Note: onComplete is now handled by the App timer
		}
	}, [active, onComplete]);

	// Geometry setup
	const geometry = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3));
		geo.setAttribute('scale', new THREE.BufferAttribute(particles.scales, 1));
		geo.setAttribute('color', new THREE.BufferAttribute(particles.colors, 3));
		return geo;
	}, [particles]);

	return (
		<points ref={pointsRef} geometry={geometry} frustumCulled={false}>
			<pointsMaterial
				size={0.2} // Base size for squares
				sizeAttenuation={true}
				vertexColors={true}
				transparent={true}
				opacity={0}
				depthWrite={false} // Prevent particles hiding each other incorrectly
				blending={THREE.AdditiveBlending} // Brighter where particles overlap
			/>
		</points>
	);
};

export default StargateWormholeEffect;
