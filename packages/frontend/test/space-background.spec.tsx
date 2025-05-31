import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { SpaceBackground } from '../src/components/space-background';

vi.mock('../src/services/game-service', () => ({
	useGameService: () => ({
		queries: { starsBySystemId: () => undefined },
	}),
}));

vi.mock('@livestore/react', () => ({
	useQuery: () => [{ id: 'star1', type: 'red giant' }],
}));

describe('SpaceBackground', () => {
	it('renders star with color based on star type', () => {
		render(<SpaceBackground mode='system' systemId='sys1' />);
		const sun = screen.getByTestId('sun');
		expect(sun).toHaveAttribute('fill', '#ff6666');
	});

	it('renders FTL bubble in ftl mode', () => {
		render(<SpaceBackground mode='ftl' />);
		expect(screen.getByTestId('ftl-bubble')).toBeInTheDocument();
	});
});
