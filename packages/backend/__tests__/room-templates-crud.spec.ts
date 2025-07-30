import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
	getAllRoomTemplates,
	getRoomTemplateById,
	createRoomTemplate,
	updateRoomTemplate,
	deleteRoomTemplate,
} from '../src/data/room-templates';
import type { Env } from '../src/types';

describe('room-templates CRUD operations', () => {
	let testTemplateId: string;

	const testTemplateData = {
		layout_id: 'test-layout',
		type: 'test-room',
		name: 'Test Room Template',
		description: 'A test room template for testing CRUD operations',
		default_width: 100,
		default_height: 100,
		default_image: 'test-room.png',
		category: 'test',
		min_width: 50,
		max_width: 200,
		min_height: 50,
		max_height: 200,
		placement_requirements: '{"test": true}',
		compatible_layouts: '["test-layout"]',
		tags: '["test", "template"]',
		version: '1.0',
		is_active: true,
	};

	afterEach(async () => {
		// Clean up test template if it exists
		if (testTemplateId) {
			try {
				await deleteRoomTemplate((env as Env).DB, testTemplateId);
			} catch (error) {
				// Ignore cleanup errors
			}
			testTemplateId = '';
		}
	});

	it('should create a room template', async () => {
		const template = await createRoomTemplate((env as Env).DB, testTemplateData);

		expect(template).toBeDefined();
		expect(template.id).toBeDefined();
		expect(template.name).toBe(testTemplateData.name);
		expect(template.layout_id).toBe(testTemplateData.layout_id);
		expect(template.type).toBe(testTemplateData.type);
		expect(template.default_width).toBe(testTemplateData.default_width);
		expect(template.default_height).toBe(testTemplateData.default_height);
		expect(template.created_at).toBeDefined();
		expect(template.updated_at).toBeDefined();

		testTemplateId = template.id;
	});

	it('should update a room template', async () => {
		// First create a template
		const template = await createRoomTemplate((env as Env).DB, testTemplateData);
		testTemplateId = template.id;

		// Update the template
		const updateData = {
			name: 'Updated Test Room Template',
			description: 'Updated description',
			default_width: 150,
			default_height: 150,
		};

		const updatedTemplate = await updateRoomTemplate((env as Env).DB, template.id, updateData);

		expect(updatedTemplate).toBeDefined();
		expect(updatedTemplate?.name).toBe(updateData.name);
		expect(updatedTemplate?.description).toBe(updateData.description);
		expect(updatedTemplate?.default_width).toBe(updateData.default_width);
		expect(updatedTemplate?.default_height).toBe(updateData.default_height);
		expect(updatedTemplate?.updated_at).toBeGreaterThan(template.updated_at);
	});

	it('should delete a room template', async () => {
		// First create a template
		const template = await createRoomTemplate((env as Env).DB, testTemplateData);
		testTemplateId = template.id;

		// Verify it exists
		const existingTemplate = await getRoomTemplateById((env as Env).DB, template.id);
		expect(existingTemplate).not.toBeNull();

		// Delete the template
		const deleted = await deleteRoomTemplate((env as Env).DB, template.id);
		expect(deleted).toBe(true);

		// Verify it's gone
		const deletedTemplate = await getRoomTemplateById((env as Env).DB, template.id);
		expect(deletedTemplate).toBeNull();

		testTemplateId = ''; // Already deleted
	});

	it('should return null when updating non-existent template', async () => {
		const result = await updateRoomTemplate((env as Env).DB, 'non-existent-id', { name: 'Updated' });
		expect(result).toBeNull();
	});

	it('should return false when deleting non-existent template', async () => {
		const result = await deleteRoomTemplate((env as Env).DB, 'non-existent-id');
		expect(result).toBe(false);
	});
});
