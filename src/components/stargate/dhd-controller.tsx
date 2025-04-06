import React, { useEffect } from 'react';
import { DHD } from '../assets';

interface DHDControllerProps {
	isActive: boolean;
	position: [number, number, number];
	onActivate: () => void;
	interactableObject: string | null;
}

const DHDController: React.FC<DHDControllerProps> = ({
	isActive,
	position,
	onActivate,
	interactableObject
}) => {
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
		<DHD
			position={position}
			isActive={isActive}
			onActivate={onActivate}
		/>
	);
};

export default DHDController;
