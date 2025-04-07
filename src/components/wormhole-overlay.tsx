import React, { useEffect } from 'react';
import { useGameStore } from './game';
// No need to import SCSS as it's handled by main.scss

/**
 * Component that creates DOM overlay effects for wormhole travel
 */
const WormholeOverlay: React.FC = () => {
	const { isInWormhole } = useGameStore();

	// Create and manage DOM elements for the travel effect
	useEffect(() => {
		// Create overlay elements if they don't exist
		let wormholeOverlay = document.getElementById('wormhole-overlay');
		let filmGrain = document.getElementById('film-grain');
		let locationTransition = document.getElementById('location-transition');

		if (!wormholeOverlay) {
			wormholeOverlay = document.createElement('div');
			wormholeOverlay.id = 'wormhole-overlay';
			wormholeOverlay.className = 'wormhole-overlay';
			document.body.appendChild(wormholeOverlay);
		}

		if (!filmGrain) {
			filmGrain = document.createElement('div');
			filmGrain.id = 'film-grain';
			filmGrain.className = 'film-grain';
			document.body.appendChild(filmGrain);
		}

		if (!locationTransition) {
			locationTransition = document.createElement('div');
			locationTransition.id = 'location-transition';
			locationTransition.className = 'location-transition';
			document.body.appendChild(locationTransition);
		}

		// Handle travel effect activation
		if (isInWormhole) {
			// Start with location transition flash
			locationTransition?.classList.add('active');

			// After a short delay, hide the flash and show wormhole
			setTimeout(() => {
				locationTransition?.classList.remove('active');
				wormholeOverlay?.classList.add('active');
				filmGrain?.classList.add('active');

				// Play whoosh sound
				const audio = new Audio('/sounds/wormhole-whoosh.mp3');
				audio.volume = 0.5;
				audio.play().catch(e => console.log('Audio play failed:', e));
			}, 500);
		} else {
			// Handle exit from wormhole
			if (wormholeOverlay?.classList.contains('active')) {
				// Show the flash again when exiting the wormhole
				locationTransition?.classList.add('active');

				// After short delay, hide everything
				setTimeout(() => {
					wormholeOverlay?.classList.remove('active');
					filmGrain?.classList.remove('active');

					// Final flash disappears
					setTimeout(() => {
						locationTransition?.classList.remove('active');
					}, 500);
				}, 500);
			}
		}

		// Cleanup function
		return () => {
			// Don't remove elements, just clean up classes if component unmounts
			wormholeOverlay?.classList.remove('active');
			filmGrain?.classList.remove('active');
			locationTransition?.classList.remove('active');
		};
	}, [isInWormhole]);

	// This component doesn't render anything directly - it just manages DOM elements
	return null;
};

export default WormholeOverlay;
