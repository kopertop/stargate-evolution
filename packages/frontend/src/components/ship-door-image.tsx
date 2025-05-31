import React from 'react';

interface ShipDoorImageProps {
	state: string;
	isDanger: boolean;
	isCodeLocked: boolean;
	width: number;
	height: number;
}

export const ShipDoorImage: React.FC<ShipDoorImageProps> = ({ state, isDanger, isCodeLocked, width, height }) => {
	const baseColor = state === 'opened' ? '#b0e57c' : state === 'locked' ? (isDanger ? '#d9534f' : '#f0ad4e') : state === 'closed' ? '#888' : '#ccc';
	const strokeColor = state === 'locked' ? (isDanger ? '#a94442' : '#b8860b') : '#333';
	const codeColor = isCodeLocked ? '#ffd700' : baseColor;
	const doorFill = isCodeLocked ? codeColor : baseColor;
	const doorOpacity = state === 'opened' ? 0.4 : 0.85;

	// Determine light color
	let lightColor = '#2196f3'; // Default: tech blue
	let glowColor = '#2196f3';
	if (state === 'locked') {
		lightColor = '#ffd700'; // Gold
		glowColor = '#ffd700';
	} else if (isDanger) {
		lightColor = '#d9534f'; // Red
		glowColor = '#d9534f';
	} else if (state === 'closed') {
		lightColor = '#2196f3'; // Blue
		glowColor = '#2196f3';
	} else if (state === 'non-functional' || state === 'destroyed') {
		lightColor = '#eee'; // White/dark
		glowColor = '#222';
	}

	// Cog SVG path (simple gear)
	const cogRadius = Math.min(width, height) * 0.22;
	const centerX = width / 2;
	const centerY = height / 2;

	// SVG filter for glow
	const filterId = 'door-glow';

	if (state === 'opened') {
		const frameThickness = Math.max(2, width * 0.12);
		return (
			<g>
				{/* Left frame */}
				<rect
					x={0}
					y={0}
					width={frameThickness}
					height={height}
					fill={baseColor}
					stroke={strokeColor}
					strokeWidth={1}
					opacity={0.7}
				/>
				{/* Right frame */}
				<rect
					x={width - frameThickness}
					y={0}
					width={frameThickness}
					height={height}
					fill={baseColor}
					stroke={strokeColor}
					strokeWidth={1}
					opacity={0.7}
				/>
			</g>
		);
	}

	return (
		<g>
			<defs>
				<filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<rect
				rx={height/3}
				ry={height/3}
				x={0}
				y={0}
				width={width}
				height={height}
				fill={doorFill}
				stroke={strokeColor}
				strokeWidth={2}
				opacity={doorOpacity}
			/>
			{/* Center cog with glowing light */}
			<g>
				{/* Simple cog: 8 teeth */}
				{[...Array(8)].map((_, i) => {
					const angle = (i * Math.PI) / 4;
					const toothLength = cogRadius * 0.55;
					const x1 = centerX + Math.cos(angle) * (cogRadius - toothLength * 0.5);
					const y1 = centerY + Math.sin(angle) * (cogRadius - toothLength * 0.5);
					const x2 = centerX + Math.cos(angle) * (cogRadius + toothLength * 0.5);
					const y2 = centerY + Math.sin(angle) * (cogRadius + toothLength * 0.5);
					return (
						<rect
							key={i}
							x={centerX - 1.5 + Math.cos(angle) * (cogRadius - toothLength * 0.5)}
							y={centerY - 1.5 + Math.sin(angle) * (cogRadius - toothLength * 0.5)}
							width={3}
							height={toothLength}
							fill='#888'
							stroke='#222'
							strokeWidth={0.7}
							transform={`rotate(${(angle * 180) / Math.PI} ${centerX} ${centerY})`}
							radius={1}
						/>
					);
				})}
				{/* Cog body */}
				<circle
					cx={centerX}
					cy={centerY}
					r={cogRadius}
					fill='#bbb'
					stroke='#444'
					strokeWidth={1.5}
				/>
				{/* Glowing light */}
				<circle
					cx={centerX}
					cy={centerY}
					r={cogRadius * 0.45}
					fill={lightColor}
					filter={`url(#${filterId})`}
					opacity={0.95}
				/>
			</g>
			{/* Locked: show a lock icon */}
			{state === 'locked' && !isDanger && !isCodeLocked && (
				<g>
					<rect x={width*0.35} y={height*0.4} width={width*0.3} height={height*0.3} fill='#fff' stroke='#333' strokeWidth={1} rx={2} />
					<ellipse cx={width/2} cy={height*0.4} rx={width*0.12} ry={height*0.13} fill='#fff' stroke='#333' strokeWidth={1} />
				</g>
			)}
			{/* Danger: show a warning triangle */}
			{isDanger && (
				<polygon points={`${width/2},${height*0.2} ${width*0.7},${height*0.7} ${width*0.3},${height*0.7}`} fill='#d9534f' stroke='#a94442' strokeWidth={1} />
			)}
			{/* Code-locked: show a key icon */}
			{isCodeLocked && (
				<g>
					<circle cx={width*0.7} cy={height*0.7} r={height*0.09} fill='#ffd700' stroke='#b8860b' strokeWidth={1} />
					<rect x={width*0.6} y={height*0.68} width={width*0.18} height={height*0.06} fill='#ffd700' stroke='#b8860b' strokeWidth={1} rx={2} />
				</g>
			)}
		</g>
	);
};
