import { useQuery } from '@livestore/react';
import React, { useMemo } from 'react';

import { useGameService } from '../services/game-service';

interface SpaceBackgroundProps {
       mode: 'system' | 'ftl' | 'empty';
       systemId?: string;
}

const STAR_COLORS: Record<string, string> = {
	'yellow dwarf': '#ffe066',
	'red giant': '#ff6666',
	'blue giant': '#66aaff',
	'white dwarf': '#e0e0ff',
	'neutron star': '#ccccff',
	'black hole': '#222233',
	unknown: '#888888',
};

const STAR_SIZES: Record<string, number> = {
	'yellow dwarf': 20,
	'red giant': 40,
	'blue giant': 35,
	'white dwarf': 10,
	'neutron star': 6,
	'black hole': 25,
	unknown: 15,
};

export const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ mode, systemId }) => {
	const gameService = useGameService();
	const stars = useQuery(gameService.queries.starsBySystemId(systemId || '')) || [];
	const starType = stars[0]?.type ?? 'unknown';
	const patternId = useMemo(() => `star-pattern-${systemId || 'default'}`, [systemId]);
	const starColor = STAR_COLORS[starType] ?? STAR_COLORS.unknown;
	const radius = STAR_SIZES[starType] ?? STAR_SIZES.unknown;
	const pointCount = 8;

	const starPath = useMemo(() => {
		const step = (Math.PI * 2) / pointCount;
		let path = '';
		for (let i = 0; i < pointCount; i++) {
			const angle = i * step;
			const r = i % 2 === 0 ? radius : radius / 2;
			const x = 90 + r * Math.cos(angle);
			const y = 50 + r * Math.sin(angle);
			path += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
		}
		return `${path}Z`;
	}, [pointCount, radius]);

	return (
		<svg
			width='100%'
			height='100%'
			style={{ position: 'absolute', top: 0, left: 0 }}
			preserveAspectRatio='xMidYMid slice'
		>
			<defs>
				<pattern id={patternId} x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'>
					<circle cx='10' cy='10' r='0.5' fill='#ffffff' opacity='0.7' />
					<circle cx='25' cy='25' r='0.7' fill='#88aaff' opacity='0.5' />
					<circle cx='30' cy='5' r='0.4' fill='#ffffff' opacity='0.4' />
				</pattern>
				<radialGradient id='ftlGradient' cx='50%' cy='50%' r='50%'>
					<stop offset='0%' stopColor='#223' />
					<stop offset='100%' stopColor='#000' />
				</radialGradient>
			</defs>
			<rect width='100%' height='100%' fill={`url(#${patternId})`} />
			{mode === 'system' && (
				<path data-testid='sun' d={starPath} fill={starColor} opacity='0.9' />
			)}
			{mode === 'ftl' && (
				<circle data-testid='ftl-bubble' cx='50%' cy='50%' r='50%' fill='url(#ftlGradient)'>
					<animateTransform attributeName='transform' type='rotate' from='0 50 50' to='360 50 50' dur='10s' repeatCount='indefinite' />
				</circle>
			)}
		</svg>
	);
};
