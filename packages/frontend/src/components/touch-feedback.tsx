import React, { useState, useEffect } from 'react';

import { isMobileDevice } from '../utils/mobile-utils';

interface TouchRipple {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface TouchFeedbackProps {
  className?: string;
}

/**
 * Component that provides visual feedback for touch interactions
 */
export const TouchFeedback: React.FC<TouchFeedbackProps> = ({ className = '' }) => {
	const [ripples, setRipples] = useState<TouchRipple[]>([]);
	const [nextId, setNextId] = useState(1);

	useEffect(() => {
		if (!isMobileDevice()) return;

		const handleTouch = (e: TouchEvent) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				addRipple(touch.clientX, touch.clientY);
			}
		};

		// Add touch listener to document to catch all touches
		document.addEventListener('touchstart', handleTouch, { passive: true });

		return () => {
			document.removeEventListener('touchstart', handleTouch);
		};
	}, []);

	const addRipple = (x: number, y: number) => {
		const newRipple: TouchRipple = {
			id: nextId,
			x,
			y,
			timestamp: Date.now(),
		};

		setRipples(prev => [...prev, newRipple]);
		setNextId(prev => prev + 1);

		// Remove ripple after animation completes
		setTimeout(() => {
			setRipples(prev => prev.filter(r => r.id !== newRipple.id));
		}, 600);
	};

	// Don't render on desktop
	if (!isMobileDevice()) {
		return null;
	}

	return (
		<div
			className={`touch-feedback-container ${className}`}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				pointerEvents: 'none',
				zIndex: 9999,
			}}
		>
			{ripples.map((ripple) => (
				<div
					key={ripple.id}
					className="touch-ripple"
					style={{
						position: 'absolute',
						left: ripple.x - 20,
						top: ripple.y - 20,
						width: 40,
						height: 40,
						borderRadius: '50%',
						background: 'rgba(0, 255, 255, 0.4)', // Cyan for better visibility
						border: '2px solid rgba(0, 255, 255, 0.8)',
						animation: 'touchRipple 0.6s ease-out forwards',
						boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
						transform: 'scale(0)',
					}}
				/>
			))}
		</div>
	);
};