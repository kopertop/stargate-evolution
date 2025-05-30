import React from 'react';

import { BaseStarfield } from './base-starfield';

interface FTLBackgroundProps {
	className?: string;
}

export const FTLBackground: React.FC<FTLBackgroundProps> = ({ className = '' }) => {
	return (
	<svg className={className} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
	<defs>
	<radialGradient id="ftlGlow" cx="50%" cy="50%" r="60%">
	<stop offset="0%" stopColor="rgba(90,120,255,0.8)" />
	<stop offset="100%" stopColor="rgba(10,20,50,0.1)" />
	</radialGradient>
	</defs>
	<rect width="100%" height="100%" fill="url(#ftlGlow)" />
	<BaseStarfield seed={42} starCount={400} />
	</svg>
	);
};
