import React from 'react';

import { BaseStarfield } from './base-starfield';

const STAR_COLORS: Record<string, string> = {
	'blue giant': '#88aaff',
	'red dwarf': '#ff8888',
	'yellow dwarf': '#ffe066',
	'white dwarf': '#e0e0ff',
	default: '#ffe066',
};

interface SolarSystemBackgroundProps {
	starType?: string;
	className?: string;
}

export const SolarSystemBackground: React.FC<SolarSystemBackgroundProps> = ({ starType = 'yellow dwarf', className = '' }) => {
	const color = STAR_COLORS[starType] || STAR_COLORS.default;
	return (
	<svg className={className} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
	<BaseStarfield seed={7} starCount={250} />
	<circle cx="90%" cy="50%" r="30%" fill={color} />
	</svg>
	);
};
