import React, { useRef, useEffect } from 'react';

interface Galaxy {
	id: string;
	name: string;
	position: { x: number; y: number };
	starSystems: any[];
}

interface GalaxyMapProps {
	galaxies: Galaxy[];
	onGalaxySelect?: (galaxy: Galaxy) => void;
}

export const GalaxyMap: React.FC<GalaxyMapProps> = ({ galaxies, onGalaxySelect }) => {
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

		// Calculate bounds of all galaxies
		const minX = Math.min(...galaxies.map(g => g.position.x));
		const maxX = Math.max(...galaxies.map(g => g.position.x));
		const minY = Math.min(...galaxies.map(g => g.position.y));
		const maxY = Math.max(...galaxies.map(g => g.position.y));

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

		// Draw galaxies
		galaxies.forEach((galaxy, index) => {
			const x = galaxy.position.x * scale + offsetX;
			const y = galaxy.position.y * scale + offsetY;

			// Galaxy glow effect
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
			gradient.addColorStop(0, 'rgba(100, 150, 255, 0.8)');
			gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
			gradient.addColorStop(1, 'rgba(100, 150, 255, 0.1)');

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(x, y, 40, 0, Math.PI * 2);
			ctx.fill();

			// Galaxy core
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(x, y, 8, 0, Math.PI * 2);
			ctx.fill();

			// Galaxy spiral arms (simple representation)
			ctx.strokeStyle = 'rgba(150, 180, 255, 0.6)';
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

			// Galaxy name
			ctx.fillStyle = '#ffffff';
			ctx.font = '14px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(galaxy.name, x, y + 60);

			// System count
			ctx.fillStyle = '#aaaaaa';
			ctx.font = '12px Arial';
			ctx.fillText(`${galaxy.starSystems.length} systems`, x, y + 75);
		});

	}, [galaxies]);

	const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		if (!onGalaxySelect) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Calculate galaxy positions (same logic as drawing)
		if (galaxies.length === 0) return;

		const minX = Math.min(...galaxies.map(g => g.position.x));
		const maxX = Math.max(...galaxies.map(g => g.position.x));
		const minY = Math.min(...galaxies.map(g => g.position.y));
		const maxY = Math.max(...galaxies.map(g => g.position.y));

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
			const galaxyX = galaxy.position.x * scale + offsetX;
			const galaxyY = galaxy.position.y * scale + offsetY;
			const distance = Math.sqrt((x - galaxyX) ** 2 + (y - galaxyY) ** 2);

			if (distance <= 40) { // Within galaxy radius
				onGalaxySelect(galaxy);
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
				{onGalaxySelect && (
					<p className="text-light small mb-0">Click a galaxy to explore</p>
				)}
			</div>
		</div>
	);
};
