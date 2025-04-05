import React, { useState, useEffect } from 'react';

const MovementTutorial: React.FC = () => {
	const [isVisible, setIsVisible] = useState(true);

	// Set up a keyboard listener to show/hide the tutorial
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
				<li>Press <span className="key">?</span> or click the help button to show this help again</li>
			</ul>
			<div className="close-button" onClick={handleClose}>✕</div>
		</div>
	);
};

export default MovementTutorial;
