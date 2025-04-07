import React, { useState, useEffect } from 'react';

// Local storage key
const TUTORIAL_SHOWN_KEY = 'stargate-movement-tutorial-shown';

const MovementTutorial: React.FC = () => {
	// Initialize to hidden, we'll check localStorage in useEffect
	const [isVisible, setIsVisible] = useState(false);

	// Check if tutorial has been shown before on component mount
	useEffect(() => {
		const hasShownTutorial = localStorage.getItem(TUTORIAL_SHOWN_KEY) === 'true';

		// Only show tutorial if it hasn't been shown before
		if (!hasShownTutorial) {
			setIsVisible(true);
			// Mark as shown for future sessions
			localStorage.setItem(TUTORIAL_SHOWN_KEY, 'true');
		}
	}, []);

	// Set up a keyboard listener to show/hide the tutorial with ? key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === '?') {
				setIsVisible(prev => !prev);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	// Handle the close button click
	const handleClose = () => {
		setIsVisible(false);
	};

	if (!isVisible) return null;

	return (
		<div className="movement-tutorial">
			<h2>Movement Controls:</h2>
			<ul>
				<li>Use <span className="key">W</span>, <span className="key">A</span>, <span className="key">S</span>, <span className="key">D</span> or arrow keys to move</li>
				<li>Hold <span className="key">Right Mouse Button</span> and move mouse to rotate the camera</li>
				<li>Alternatively, use <span className="key">Q</span> and <span className="key">E</span> to rotate the camera</li>
				<li>Press <span className="key">Space</span> to interact with the DHD</li>
				<li>Walk through the active Stargate to travel</li>
				<li>Press <span className="key">?</span> or click the help button to show this help again</li>
			</ul>
			<div className="close-button" onClick={handleClose}>✕</div>
		</div>
	);
};

// Add a helper function to reset tutorial if needed
export const resetTutorial = () => {
	localStorage.removeItem(TUTORIAL_SHOWN_KEY);
};

export default MovementTutorial;
