import React from 'react';

interface BaseStarfieldProps {
	seed?: number;
	starCount?: number;
	className?: string;
}

function seededRandom(seed: number): () => number {
	let s = seed % 2147483647;
	return (): number => {
	s = (s * 16807) % 2147483647;
	return (s - 1) / 2147483646;
	};
}

export const BaseStarfield: React.FC<BaseStarfieldProps> = ({
	seed = 1,
	starCount = 200,
	className = '',
}) => {
	const rand = seededRandom(seed);
	const stars = Array.from({ length: starCount }, (_, i) => {
	const x = rand() * 100;
	const y = rand() * 100;
	const size = rand() * 1.2 + 0.2;
	const opacity = rand() * 0.8 + 0.2;
	return (
	<circle key={i} cx={`${x}%`} cy={`${y}%`} r={size} fill="white" opacity={opacity.toFixed(2)} />
	);
	});

	return (
	<svg className={className} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
	<rect width="100%" height="100%" fill="#000" />
	<g>{stars}</g>
	</svg>
	);
};
