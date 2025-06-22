import React from 'react';

// Space background component removed - focusing on Admin functionality only
// If space functionality is needed later, it should use direct API calls instead of LiveStore

export const SpaceBackground: React.FC = () => {
	return (
		<div style={{
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			background: 'linear-gradient(to bottom, #000011, #000033)',
			zIndex: -1,
		}}>
			{/* Simple static starfield */}
			{Array.from({ length: 100 }).map((_, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						top: `${Math.random() * 100}%`,
						left: `${Math.random() * 100}%`,
						width: '2px',
						height: '2px',
						background: 'white',
						borderRadius: '50%',
						opacity: Math.random() * 0.8 + 0.2,
					}}
				/>
			))}
		</div>
	);
};
