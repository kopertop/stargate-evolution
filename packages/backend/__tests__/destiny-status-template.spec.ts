import { DestinyStatusSchema } from '@stargate/common/models/destiny-status';
import { describe, it, expect } from 'vitest';

import { getDefaultDestinyStatusTemplate } from '../src/data/destiny-status-template';

describe('destiny-status-template', () => {
	it('returns a valid default destiny status', () => {
		const status = getDefaultDestinyStatusTemplate();
		// Should be valid according to the schema
		expect(() => DestinyStatusSchema.parse(status)).not.toThrow();
		expect(status).toHaveProperty('id', 'destiny-status-default');
		expect(status).toHaveProperty('name', 'Destiny');
		// Check a few key fields
		expect(status).toHaveProperty('power');
		expect(status).toHaveProperty('max_power');
		expect(status).toHaveProperty('shields');
		expect(status).toHaveProperty('max_shields');
	});
});
