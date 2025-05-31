import type { Galaxy } from '@stargate/common';
import React, { useRef, useEffect } from 'react';

interface GalaxyMapProps {
	galaxies: Galaxy[];
	onGalaxySelect?: (galaxy: Galaxy) => void;
	currentGalaxyId?: string;
	shipPower?: number;
	maxTravelRange?: number;
}

// Calculate distance between two points
function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
	return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
}

// Calculate travel cost based on distance (can be tweaked for game balance)
function calculateTravelCost(distance: number): number {
	return Math.ceil(distance / 10); // 1 power per 10 distance units
}

export const GalaxyMap: React.FC<GalaxyMapProps> = ({
	galaxies,
	onGalaxySelect,
	currentGalaxyId,
	shipPower = 0,
	maxTravelRange = 500, // Default travel range
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas size
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * window.devicePixelRatio;
		canvas.height = rect.height * window.devicePixelRatio;
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

		// Clear canvas
		ctx.fillStyle = '#0a0a0f';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw stars background
		ctx.fillStyle = '#ffffff';
		for (let i = 0; i < 200; i++) {
			const x = Math.random() * rect.width;
			const y = Math.random() * rect.height;
			const size = Math.random() * 2;
			ctx.globalAlpha = Math.random() * 0.8 + 0.2;
			ctx.fillRect(x, y, size, size);
		}
		ctx.globalAlpha = 1;

		if (galaxies.length === 0) return;

		// Find current galaxy
		const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId);

		// Calculate bounds of all galaxies
		const minX = Math.min(...galaxies.map(g => g.x));
		const maxX = Math.max(...galaxies.map(g => g.x));
		const minY = Math.min(...galaxies.map(g => g.y));
		const maxY = Math.max(...galaxies.map(g => g.y));

		// Add padding
		const padding = 100;
		const totalWidth = maxX - minX + 2 * padding;
		const totalHeight = maxY - minY + 2 * padding;

		// Calculate scale to fit all galaxies
		const scaleX = (rect.width - 100) / totalWidth;
		const scaleY = (rect.height - 100) / totalHeight;
		const scale = Math.min(scaleX, scaleY, 1);

		// Center the map
		const offsetX = (rect.width - totalWidth * scale) / 2 - (minX - padding) * scale;
		const offsetY = (rect.height - totalHeight * scale) / 2 - (minY - padding) * scale;

		// Draw travel range circle if we have a current galaxy
		if (currentGalaxy) {
			const currentX = currentGalaxy.x * scale + offsetX;
			const currentY = currentGalaxy.y * scale + offsetY;
			const rangeRadius = maxTravelRange * scale;

			// Draw travel range circle
			ctx.strokeStyle = 'rgba(100, 255, 100, 0.3)';
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 5]);
			ctx.beginPath();
			ctx.arc(currentX, currentY, rangeRadius, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Draw galaxies
		for (const galaxy of galaxies) {
			const x = galaxy.x * scale + offsetX;
			const y = galaxy.y * scale + offsetY;

			// Calculate if this galaxy is within travel range
			const distance = currentGalaxy ? calculateDistance({
				x: currentGalaxy.x,
				y: currentGalaxy.y,
			}, {
				x: galaxy.x,
				y: galaxy.y,
			}) : 0;
			const travelCost = calculateTravelCost(distance);
			const isCurrentGalaxy = galaxy.id === currentGalaxyId;
			const isInRange = isCurrentGalaxy || distance <= maxTravelRange;
			const canAffordTravel = isCurrentGalaxy || travelCost <= shipPower;
			const isClickable = isInRange && canAffordTravel;

			// Determine galaxy appearance
			let baseAlpha = 1;
			let glowColor = 'rgba(100, 150, 255, 0.8)';

			if (isCurrentGalaxy) {
				// Current galaxy - bright green glow
				glowColor = 'rgba(100, 255, 100, 0.9)';
			} else if (!isInRange || !canAffordTravel) {
				// Out of range or can't afford - grey and dim
				baseAlpha = 0.3;
				glowColor = 'rgba(150, 150, 150, 0.3)';
			}

			// Galaxy glow effect
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
			gradient.addColorStop(0, glowColor);
			gradient.addColorStop(0.5, glowColor.replace(/0\.\d+/, '0.4'));
			gradient.addColorStop(1, glowColor.replace(/0\.\d+/, '0.1'));

			ctx.globalAlpha = baseAlpha;
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(x, y, 40, 0, Math.PI * 2);
			ctx.fill();

			// Galaxy core
			if (isCurrentGalaxy) {
				ctx.fillStyle = '#00ff00'; // Green for current galaxy
			} else if (!isClickable) {
				ctx.fillStyle = '#888888'; // Grey for unreachable
			} else {
				ctx.fillStyle = '#ffffff'; // White for reachable
			}
			ctx.beginPath();
			ctx.arc(x, y, 8, 0, Math.PI * 2);
			ctx.fill();

			// Galaxy spiral arms (simple representation)
			ctx.globalAlpha = baseAlpha * 0.6;
			if (isCurrentGalaxy) {
				ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
			} else if (!isClickable) {
				ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
			} else {
				ctx.strokeStyle = 'rgba(150, 180, 255, 0.6)';
			}
			ctx.lineWidth = 2;
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				const angle = (i * Math.PI * 2) / 3;
				for (let r = 10; r < 35; r += 2) {
					const spiralAngle = angle + r * 0.2;
					const spiralX = x + Math.cos(spiralAngle) * r;
					const spiralY = y + Math.sin(spiralAngle) * r;
					if (r === 10) {
						ctx.moveTo(spiralX, spiralY);
					} else {
						ctx.lineTo(spiralX, spiralY);
					}
				}
				ctx.stroke();
			}

			ctx.globalAlpha = baseAlpha;

			// Galaxy name
			if (isCurrentGalaxy) {
				ctx.fillStyle = '#00ff00';
			} else if (!isClickable) {
				ctx.fillStyle = '#888888';
			} else {
				ctx.fillStyle = '#ffffff';
			}
			ctx.font = '14px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(galaxy.name, x, y + 60);

			// System count and travel info
			let infoText = '';
			if (!isCurrentGalaxy && distance > 0) {
				infoText += ` • ${distance.toFixed(0)} ly • ${travelCost} power`;
			}

			if (isCurrentGalaxy) {
				ctx.fillStyle = '#88ff88';
				infoText = `★ CURRENT LOCATION • ${infoText}`;
			} else if (!isClickable) {
				ctx.fillStyle = '#666666';
				if (!isInRange) infoText += ' • OUT OF RANGE';
				else if (!canAffordTravel) infoText += ' • INSUFFICIENT POWER';
			} else {
				ctx.fillStyle = '#aaaaaa';
			}

			ctx.font = '12px Arial';
			ctx.fillText(infoText, x, y + 75);

			// Ship indicator for current galaxy
			if (isCurrentGalaxy) {
				ctx.fillStyle = '#00ff00';
				ctx.font = '20px Arial';
				ctx.fillText('🚀', x - 10, y - 50);
			}
		}

		ctx.globalAlpha = 1;

	}, [galaxies, currentGalaxyId, shipPower, maxTravelRange]);

	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!onGalaxySelect) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Calculate galaxy positions (same logic as drawing)
		if (galaxies.length === 0) return;

		const currentGalaxy = galaxies.find(g => g.id === currentGalaxyId);

		const minX = Math.min(...galaxies.map(g => g.x));
		const maxX = Math.max(...galaxies.map(g => g.x));
		const minY = Math.min(...galaxies.map(g => g.y));
		const maxY = Math.max(...galaxies.map(g => g.y));

		const padding = 100;
		const totalWidth = maxX - minX + 2 * padding;
		const totalHeight = maxY - minY + 2 * padding;

		const scaleX = (rect.width - 100) / totalWidth;
		const scaleY = (rect.height - 100) / totalHeight;
		const scale = Math.min(scaleX, scaleY, 1);

		const offsetX = (rect.width - totalWidth * scale) / 2 - (minX - padding) * scale;
		const offsetY = (rect.height - totalHeight * scale) / 2 - (minY - padding) * scale;

		// Check if click is within any galaxy
		for (const galaxy of galaxies) {
			const galaxyX = galaxy.x * scale + offsetX;
			const galaxyY = galaxy.y * scale + offsetY;
			const distance = Math.sqrt((x - galaxyX) ** 2 + (y - galaxyY) ** 2);

			if (distance <= 40) { // Within galaxy radius
				// Check if galaxy is reachable
				const travelDistance = currentGalaxy ? calculateDistance({
					x: currentGalaxy.x,
					y: currentGalaxy.y,
				}, {
					x: galaxy.x,
					y: galaxy.y,
				}) : 0;
				const travelCost = calculateTravelCost(travelDistance);
				const isCurrentGalaxy = galaxy.id === currentGalaxyId;
				const isInRange = isCurrentGalaxy || travelDistance <= maxTravelRange;
				const canAffordTravel = isCurrentGalaxy || travelCost <= shipPower;

				if (isInRange && canAffordTravel) {
					onGalaxySelect(galaxy);
				}
				break;
			}
		}
	};

	return (
		<div className="position-relative w-100 h-100">
			<canvas
				ref={canvasRef}
				className="w-100 h-100"
				style={{ cursor: onGalaxySelect ? 'pointer' : 'default' }}
				onClick={handleCanvasClick}
			/>
			<div className="position-absolute top-0 start-0 p-3" style={{ marginTop: '60px' }}>
				<h4 className="text-white mb-2">Galaxy Map</h4>
				<p className="text-light small mb-1">Discovered Galaxies: {galaxies.length}</p>
				<p className="text-success small mb-1">Current Power: {shipPower}</p>
				<p className="text-info small mb-1">Max Range: {maxTravelRange} light-years</p>
				{onGalaxySelect && (
					<p className="text-light small mb-0">Click a galaxy within range to travel</p>
				)}
			</div>
		</div>
	);
};
