import React, { useState, useEffect, useCallback } from 'react';
import { GiPlayButton, GiPauseButton, GiExpand } from 'react-icons/gi';

import { useDestinyStatus } from '../contexts/destiny-status-context';
import { useGameState } from '../contexts/game-state-context';

/**
 * CountdownClock component (shows the countdown clock and handles speed changes)
 *
 * - Uses blue color for FTL, green for normal space, red for urgent
 * - Displays time since last FTL dropout
 * - Gets countdown time from DestinyStatusProvider context
 */

const SPEED_OPTIONS: { value: number; label: string; description: string }[] = [
	{ value: 1, label: '1x', description: 'Normal Speed' },
	{ value: 60, label: '60x', description: '1 min = 1 sec' },
	{ value: 600, label: '600x', description: '10 min = 1 sec' },
	{ value: 3600, label: '3600x', description: '1 hour = 1 sec' },
];

export const CountdownClock: React.FC = () => {
	const { isPaused, timeSpeed, togglePause, setTimeSpeed } = useGameState();
	const { timeUntilNextTransition, isInFTL, destinyStatus } = useDestinyStatus();
	const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);

	// Handle speed change
	const handleSpeedChange = useCallback((newSpeed: number) => {
		setTimeSpeed(newSpeed);
		setShowSpeedDropdown(false);
	}, [setTimeSpeed]);


	// Keyboard controls
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.code === 'Space') {
				event.preventDefault();
				togglePause();
			}
			for (const [key, value] of Object.entries(SPEED_OPTIONS)) {
				if (event.code === `Digit${+key + 1}`) {
					event.preventDefault();
					handleSpeedChange(value.value);
				}
			}
		};

		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	}, [togglePause, handleSpeedChange]);


	// Convert hours to display format
	const totalMinutes = Math.max(0, Math.floor(timeUntilNextTransition / 60));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const seconds = Math.floor((timeUntilNextTransition) % 60);

	// Determine if we should show red (under 15 minutes)
	const isUrgent = timeUntilNextTransition < 0.25; // 15 minutes = 0.25 hours

	// Color logic for FTL vs normal mode
	let textColor = '#ffffff';
	if (destinyStatus) {
		if (isUrgent) {
			textColor = '#ff4444'; // Red for urgent
		} else if (isInFTL) {
			textColor = '#4da6ff'; // Blue for FTL
		} else {
			textColor = '#00ff88'; // Green for normal space
		}
	} else {
		textColor = isUrgent ? '#ff4444' : '#ffffff';
	}

	// Format time display
	const formatDigit = (num: number): string => num.toString().padStart(2, '0');

	// Split digits for easy replacement with images later
	const timeDisplay = hours > 0
		? `${formatDigit(hours)}:${formatDigit(minutes)}:${formatDigit(seconds)}`
		: `${formatDigit(minutes)}:${formatDigit(seconds)}`;

	// CSS animations as inline styles
	const pulseAnimation = isUrgent
		? 'countdownBlink 1s infinite'
		: !isPaused ? 'countdownPulse 2s infinite' : 'none';

	// Add keyframes to document head if they don't exist
	useEffect(() => {
		const styleId = 'countdown-animations';
		if (!document.getElementById(styleId)) {
			const style = document.createElement('style');
			style.id = styleId;
			style.textContent = `
				@keyframes countdownBlink {
					0%, 50% { opacity: 1; }
					51%, 100% { opacity: 0.3; }
				}

				@keyframes countdownPulse {
					0%, 100% { opacity: 0.8; }
					50% { opacity: 1; }
				}

				@keyframes speedIndicator {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(1.1); }
				}
			`;
			document.head.appendChild(style);
		}
	}, []);

	const currentSpeedOption = SPEED_OPTIONS.find(opt => opt.value === timeSpeed) || SPEED_OPTIONS[0];

	return (
		<div style={{
			position: 'fixed',
			top: '5px',
			left: '50%',
			transform: 'translateX(-50%)',
			zIndex: 20,
			display: 'flex',
			flexDirection: destinyStatus ? 'column' : 'row',
			alignItems: 'center',
			gap: destinyStatus ? '4px' : '8px',
		}}>

			{/* Main control row */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
			}}>
				{/* Pause/Play button - Left side */}
				<button
					onClick={togglePause}
					title={`${isPaused ? 'Play' : 'Pause'} (Spacebar)`}
					style={{
						fontFamily: "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
						fontSize: '18px',
						fontWeight: 'bold',
						color: '#ffffff',
						backgroundColor: isPaused ? 'rgba(255, 68, 68, 0.8)' : 'rgba(40, 167, 69, 0.8)',
						border: `1px solid ${isPaused ? '#ff4444' : '#28a745'}`,
						borderRadius: '6px',
						padding: '4px 8px',
						cursor: 'pointer',
						userSelect: 'none',
						transition: 'all 0.3s ease',
						boxShadow: `0 0 10px ${isPaused ? '#ff444430' : '#28a74530'}`,
						minWidth: '40px',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'scale(1.05)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'scale(1)';
					}}
				>
					{isPaused ? <GiPlayButton size={24} /> : <GiPauseButton size={24} />}
				</button>

				{/* Main countdown display - Center */}
				<div
					className="countdown-clock"
					style={{
						fontFamily: "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
						fontSize: '24px',
						fontWeight: 'bold',
						color: textColor,
						textShadow: `0 0 8px ${textColor}`,
						letterSpacing: '1.5px',
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						padding: '6px 12px',
						borderRadius: '6px',
						border: `1px solid ${textColor}`,
						boxShadow: `0 0 15px ${textColor}30`,
						transition: 'all 0.3s ease',
						userSelect: 'none',
					}}
				>
					{timeDisplay.split('').map((char, index) => (
						<span
							key={index}
							className={char === ':' ? 'separator' : 'digit'}
							style={{
								display: 'inline-block',
								minWidth: char === ':' ? '8px' : '20px',
								textAlign: 'center',
								...(char === ':' && {
									animation: pulseAnimation,
								}),
							}}
						>
							{char}
						</span>
					))}
				</div>

				{/* Speed dropdown - Right side */}
				<div style={{ position: 'relative' }}>
					<button
						onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
						title={`Speed: ${currentSpeedOption.description}`}
						style={{
							fontFamily: "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
							fontSize: '12px',
							fontWeight: 'bold',
							color: '#ffffff',
							backgroundColor: 'rgba(0, 123, 255, 0.8)',
							border: '1px solid #007bff',
							borderRadius: '6px',
							padding: '4px 8px',
							cursor: 'pointer',
							userSelect: 'none',
							transition: 'all 0.3s ease',
							boxShadow: '0 0 10px #007bff30',
							minWidth: '60px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							animation: !isPaused && timeSpeed !== 1 ? 'speedIndicator 1s infinite' : 'none',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'scale(1.05)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'scale(1)';
						}}
					>
						<span>{currentSpeedOption.label}</span>
						<GiExpand size={12} style={{ marginLeft: '4px' }} />
					</button>

					{/* Dropdown menu */}
					{showSpeedDropdown && (
						<div
							style={{
								position: 'absolute',
								top: '100%',
								right: '0',
								marginTop: '4px',
								backgroundColor: 'rgba(0, 0, 0, 0.9)',
								border: '1px solid #007bff',
								borderRadius: '6px',
								boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
								zIndex: 1000,
								minWidth: '160px',
							}}
						>
							{SPEED_OPTIONS.map((option) => (
								<button
									key={option.value}
									onClick={() => handleSpeedChange(option.value)}
									style={{
										display: 'block',
										width: '100%',
										padding: '8px 12px',
										backgroundColor: timeSpeed === option.value ? 'rgba(0, 123, 255, 0.3)' : 'transparent',
										color: '#ffffff',
										border: 'none',
										textAlign: 'left',
										cursor: 'pointer',
										fontFamily: "'Orbitron', 'Share Tech Mono', 'Courier New', monospace",
										fontSize: '11px',
										borderRadius: timeSpeed === option.value ? '4px' : '0',
										transition: 'all 0.2s ease',
									}}
									onMouseEnter={(e) => {
										if (timeSpeed !== option.value) {
											e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
										}
									}}
									onMouseLeave={(e) => {
										if (timeSpeed !== option.value) {
											e.currentTarget.style.backgroundColor = 'transparent';
										}
									}}
								>
									<div style={{ fontWeight: 'bold' }}>{option.label}</div>
									<div style={{ fontSize: '9px', color: '#ccc' }}>{option.description}</div>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Click outside to close dropdown */}
				{showSpeedDropdown && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 999,
						}}
						onClick={() => setShowSpeedDropdown(false)}
					/>
				)}
			</div>
		</div>
	);
};
