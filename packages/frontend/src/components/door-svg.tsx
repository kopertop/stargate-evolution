import React from 'react';

import { DOOR_SIZE, WALL_THICKNESS } from '../utils/grid-system';

export type DoorLight = 'normal' | 'locked' | 'inaccessible';
export type DoorOrientation = 'north' | 'south' | 'east' | 'west';

interface DoorSvgProps {
	readonly x: number;
	readonly y: number;
	readonly orientation: DoorOrientation;
	readonly open: boolean;
	readonly light: DoorLight;
	readonly onClick?: () => void;
}

const LIGHT_COLORS: Record<DoorLight, string> = {
	normal: '#60a5fa',
	locked: '#ef4444',
	inaccessible: '#fbbf24',
};

export const DoorSvg: React.FC<DoorSvgProps> = ({
	x,
	y,
	orientation,
	open,
	light,
	onClick,
}) => {
	const rotation = orientation === 'east' || orientation === 'west' ? 90 : 0;

	const renderClosed = (): JSX.Element => (
		<rect
			x={x - DOOR_SIZE / 2}
			y={y - WALL_THICKNESS / 2}
			width={DOOR_SIZE}
			height={WALL_THICKNESS}
			fill="#444"
		/>
	);

	const renderOpen = (): JSX.Element => (
		<g>
			<rect
				x={x - DOOR_SIZE / 2}
				y={y - WALL_THICKNESS / 2}
				width={DOOR_SIZE / 2 - 2}
				height={WALL_THICKNESS}
				fill="#444"
			/>
			<rect
				x={x + 2}
				y={y - WALL_THICKNESS / 2}
				width={DOOR_SIZE / 2 - 2}
				height={WALL_THICKNESS}
				fill="#444"
			/>
		</g>
	);

	return (
		<g
			transform={rotation !== 0 ? `rotate(${rotation} ${x} ${y})` : undefined}
			style={{ cursor: onClick ? 'pointer' : 'default' }}
			onClick={onClick}
		>
			{open ? renderOpen() : renderClosed()}
			<circle cx={x} cy={y} r={2} fill={LIGHT_COLORS[light]} />
		</g>
	);
};
