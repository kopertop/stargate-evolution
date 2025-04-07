import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StargateProps {
	position: [number, number, number];
	isActive: boolean;
	activationStage: number;
}

export const Stargate: React.FC<StargateProps> = ({
	position,
	isActive,
	activationStage
}) => {
	const gateRef = useRef<THREE.Group>(null);
	const eventHorizonRef = useRef<THREE.Mesh>(null);
	const eventHorizonMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

	// Custom shader for event horizon effect
	const eventHorizonShader = useMemo(() => ({
		uniforms: {
			time: { value: 0 },
			color1: { value: new THREE.Color('#00aaff') },
			color2: { value: new THREE.Color('#0066ff') },
			intensity: { value: 0.7 }
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float time;
			uniform vec3 color1;
			uniform vec3 color2;
			uniform float intensity;
			varying vec2 vUv;

			float noise(vec2 p) {
				return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
			}

			void main() {
				// Calculate distance from center
				vec2 center = vec2(0.5, 0.5);
				float dist = distance(vUv, center) * 2.0;

				// Ripple effect
				float ripple = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;

				// Noise for texture
				float n = noise(vUv * 10.0 + time * 0.1) * 0.1;

				// Edge glow
				float edge = smoothstep(0.8, 1.0, dist);

				// Mix colors based on ripple and distance
				vec3 finalColor = mix(color1, color2, ripple + n);

				// Edge glow effect
				finalColor = mix(finalColor, color2, edge);

				// Apply intensity
				gl_FragColor = vec4(finalColor * intensity, 1.0 - dist * 0.5);
			}
		`
	}), []);

	// Animate the event horizon when active
	useFrame((state) => {
		if (!gateRef.current) return;

		if (eventHorizonMaterialRef.current && isActive && activationStage >= 4) {
			// Update shader uniforms
			eventHorizonMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
			eventHorizonMaterialRef.current.uniforms.intensity.value =
				0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.2;

			// Slight rotation for the entire gate
			gateRef.current.rotation.y += 0.001;
		}
	});

	return (
		<group ref={gateRef} position={position}>
			{/* Main Stargate ring - outer */}
			<mesh castShadow receiveShadow position={[0, 0, 0]}>
				<torusGeometry args={[2, 0.3, 24, 48]} />
				<meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
			</mesh>

			{/* Inner ring with symbols */}
			<mesh castShadow receiveShadow position={[0, 0, 0.05]}>
				<torusGeometry args={[1.85, 0.15, 20, 36]} />
				<meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Event horizon (only visible when active) */}
			{isActive && activationStage >= 4 && (
				<mesh ref={eventHorizonRef} position={[0, 0, 0.1]}>
					<circleGeometry args={[1.7, 64]} />
					<shaderMaterial
						ref={eventHorizonMaterialRef}
						vertexShader={eventHorizonShader.vertexShader}
						fragmentShader={eventHorizonShader.fragmentShader}
						uniforms={eventHorizonShader.uniforms}
						transparent={true}
						side={THREE.DoubleSide}
					/>
				</mesh>
			)}

			{/* Chevrons */}
			{Array.from({ length: 9 }).map((_, index) => {
				const angle = (index / 9) * Math.PI * 2;
				const radius = 2;
				const x = Math.sin(angle) * radius;
				const y = Math.cos(angle) * radius;
				const chevronActive = index < activationStage;

				return (
					<group
						key={index}
						position={[x, y, 0.2]}
						rotation={[0, 0, angle + Math.PI / 2]}
					>
						{/* Chevron base */}
						<mesh castShadow>
							<boxGeometry args={[0.5, 0.3, 0.2]} />
							<meshStandardMaterial
								color="#444444"
								metalness={0.7}
								roughness={0.3}
							/>
						</mesh>

						{/* Chevron light */}
						<mesh castShadow position={[0, 0, 0.1]}>
							<boxGeometry args={[0.4, 0.2, 0.1]} />
							<meshStandardMaterial
								color={chevronActive ? '#ff5500' : '#550000'}
								emissive={chevronActive ? '#ff3300' : '#000000'}
								emissiveIntensity={chevronActive ? 0.7 : 0}
							/>
						</mesh>
					</group>
				);
			})}

			{/* Base/stand */}
			<mesh castShadow receiveShadow position={[0, -2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.5, 0.8, 0.4, 16]} />
				<meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
			</mesh>

			<mesh castShadow receiveShadow position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.2, 0.5, 1.5, 16]} />
				<meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
			</mesh>
		</group>
	);
};
