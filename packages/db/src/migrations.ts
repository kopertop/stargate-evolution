import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
	migrations: [
		{
			toVersion: 7,
			steps: [
				addColumns({
					table: 'rooms',
					columns: [
						{ name: 'template_id', type: 'string', isOptional: true },
					],
				}),
			],
		},
	],
});
