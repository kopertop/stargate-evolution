#!/usr/bin/env tsx

import { execSync } from 'child_process';
import readline from 'readline';

function createReadlineInterface() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
	return new Promise(resolve => {
		rl.question(question, answer => {
			resolve(answer);
		});
	});
}

async function confirmReset(database: string): Promise<boolean> {
	const rl = createReadlineInterface();

	console.log(`⚠️  WARNING: This will completely destroy and recreate the database: ${database}`);
	console.log('   All data will be permanently lost!');
	console.log('');

	const answer = await askQuestion(rl, 'Are you sure you want to continue? (yes/no): ');
	rl.close();

	return answer.toLowerCase() === 'yes';
}

function resetDatabase(database: string) {
	console.log(`Resetting database: ${database}`);

	try {
		// First, try to delete the database
		console.log('🗑️  Deleting existing database...');
		try {
			execSync(`wrangler d1 delete ${database} --force`, { stdio: 'inherit' });
		} catch (error) {
			console.log('   (Database may not exist yet - continuing...)');
		}

		// Create a new database
		console.log('🔨 Creating new database...');
		execSync(`wrangler d1 create ${database}`, { stdio: 'inherit' });

		console.log('');
		console.log('✅ Database reset complete!');
		console.log('');
		console.log('🔧 Next steps:');
		console.log('1. Update your wrangler.toml with the new database_id');
		console.log('2. Run: pnpm db:init to apply migrations');

	} catch (error) {
		console.error('❌ Failed to reset database');
		console.error(error);
		process.exit(1);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const database = args[0] || 'stargate-game';
	const force = args.includes('--force');

	if (!force) {
		const confirmed = await confirmReset(database);
		if (!confirmed) {
			console.log('Reset cancelled.');
			return;
		}
	}

	resetDatabase(database);
}

if (require.main === module) {
	main();
}
