import React, { useRef, useEffect } from 'react';
import { useDHDStore } from './dhd-store';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DHD } from '../assets';

const DHD_BASE_COLOR = '#555555';
const DHD_ACTIVE_COLOR = '#00aaff';
const DHD_HOVER_COLOR = '#888888';

export interface DHDControllerProps {
	position: [number, number, number];
	isActive: boolean;
	onActivate: () => void;
	interactableObject: string | null;
}

export const DHDController: React.FC<DHDControllerProps> = ({
	position,
	isActive,
	onActivate,
	interactableObject
}) => {
	const dhdRef = useRef<THREE.Group>(null);
	const { isDHDHovered, setIsDHDHovered } = useDHDStore();

	// Listen for spacebar press to trigger interaction with DHD
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space' && interactableObject === 'dhd') {
				onActivate();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [interactableObject, onActivate]);

	return (
		<group ref={dhdRef} position={position}>
			<DHD
				position={[0, 0, 0]}
				isActive={isActive}
				onActivate={onActivate}
			/>
		</group>
	);
};
