import React, { useState, useEffect } from 'react';

export default function MovementTutorial() {
	const [visible, setVisible] = useState(true);

	// Auto-hide the tutorial after 6 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			setVisible(false);
		}, 6000);

		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;

	return (
		<div className="movement-tutorial">
			<h3>Character Controls</h3>
			<p>Use the following keys to move around:</p>

			<div className="keys">
				<div className="key">W</div>
				<div className="key">A</div>
				<div className="key">S</div>
				<div className="key">D</div>
			</div>

			<p>or Arrow Keys</p>

			<div className="keys">
				<div className="key">↑</div>
				<div className="key">←</div>
				<div className="key">↓</div>
				<div className="key">→</div>
			</div>
		</div>
	);
}
