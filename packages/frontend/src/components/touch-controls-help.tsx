import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FaTimes, FaHandPaper, FaArrowsAlt } from 'react-icons/fa';

import { isMobileDevice } from '../utils/mobile-utils';

interface TouchControlsHelpProps {
  gameStarted?: boolean;
}

/**
 * Component that shows touch control instructions on mobile
 */
export const TouchControlsHelp: React.FC<TouchControlsHelpProps> = ({ gameStarted = false }) => {
	const [isVisible, setIsVisible] = useState(false);
	const [hasBeenShown, setHasBeenShown] = useState(false);

	useEffect(() => {
		if (!isMobileDevice()) return;

		// Check if user has seen the help before
		const hasSeenHelp = localStorage.getItem('stargate-touch-help-seen') === 'true';
    
		if (!hasSeenHelp && gameStarted && !hasBeenShown) {
			// Show help after a short delay when game starts
			const timer = setTimeout(() => {
				setIsVisible(true);
				setHasBeenShown(true);
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [gameStarted, hasBeenShown]);

	const handleDismiss = () => {
		setIsVisible(false);
		localStorage.setItem('stargate-touch-help-seen', 'true');
	};

	// Don't render on desktop
	if (!isMobileDevice() || !isVisible) {
		return null;
	}

	return (
		<div
			style={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 10000,
				maxWidth: '90vw',
				width: '320px',
			}}
		>
			<Alert variant="info" className="mb-0">
				<div className="d-flex justify-content-between align-items-start mb-2">
					<strong>Touch Controls</strong>
					<Button
						variant="link"
						size="sm"
						onClick={handleDismiss}
						className="p-0 text-muted"
						style={{ fontSize: '1.2rem', lineHeight: 1 }}
					>
						<FaTimes />
					</Button>
				</div>
        
				<div className="d-flex align-items-center mb-2">
					<FaArrowsAlt className="me-2 text-primary" />
					<small><strong>Drag anywhere</strong> to move your character</small>
				</div>
        
				<div className="d-flex align-items-center mb-2">
					<FaHandPaper className="me-2 text-success" />
					<small><strong>Tap objects</strong> to interact with doors and furniture</small>
				</div>
        
				<div className="text-center mt-3">
					<Button variant="primary" size="sm" onClick={handleDismiss}>
            Got it!
					</Button>
				</div>
			</Alert>
		</div>
	);
};