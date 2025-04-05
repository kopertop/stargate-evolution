import React, { useState, useEffect } from 'react';

const MovementTutorial: React.FC = () => {
	const [visible, setVisible] = useState(true);

	// Set up key event listeners to show tutorial on ? key press
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === '?') {
				setVisible(true);
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	// Auto-hide the tutorial after 10 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			setVisible(false);
		}, 10000);

		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;

	return (
		<div className="movement-tutorial">
			<h3>Movement Controls:</h3>
			<ul>
				<li>Use <span className="key">W</span>, <span className="key">A</span>, <span className="key">S</span>, <span className="key">D</span> or arrow keys to move</li>
				<li>The character will automatically face the direction of movement</li>
				<li>Collision detection prevents walking through walls, the Stargate, and DHD</li>
				<li>Press <span className="key">?</span> to show this help again</li>
			</ul>
			<div className="close-button" onClick={() => setVisible(false)}>
				×
			</div>
		</div>
	);
};

export default MovementTutorial;
