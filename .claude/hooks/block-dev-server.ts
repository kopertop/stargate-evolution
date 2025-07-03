#!/usr/bin/env tsx

import * as fs from 'fs';
import * as process from 'process';

interface HookInput {
	session_id: string;
	transcript_path: string;
	tool_name: string;
	tool_input: {
		command?: string;
		[key: string]: any;
	};
}

// Define the blocked dev server commands
const BLOCKED_DEV_COMMANDS = [
	/^pnpm\s+start$/,
	/^pnpm\s+dev$/,
	/^pnpm\s+run\s+start$/,
	/^pnpm\s+run\s+dev$/,
];

function parseInput(): HookInput {
	try {
		const input = fs.readFileSync(process.stdin.fd, 'utf8');
		return JSON.parse(input);
	} catch (error) {
		console.error(`Error parsing JSON input: ${error}`);
		process.exit(1);
	}
}

function isDevServerCommand(command: string): boolean {
	const trimmedCommand = command.trim();
	return BLOCKED_DEV_COMMANDS.some(pattern => pattern.test(trimmedCommand));
}

function main() {
	const input = parseInput();

	// Only process Bash tool calls
	if (input.tool_name !== 'Bash' || !input.tool_input.command) {
		process.exit(0);
	}

	const command = input.tool_input.command;

	if (isDevServerCommand(command)) {
		// Output blocking message to stderr for Claude to process
		console.error('• Development server is already running');
		console.error('• Please ask the user to verify the dev server status before attempting to start it');
		console.error('• You can check running processes with: ps aux | grep -E "(vite|dev|start)"');
		console.error('• Or ask the user to confirm if they want to restart the dev server');

		// Exit code 2 blocks the tool call and shows stderr to Claude
		process.exit(2);
	}

	// No issues found, allow the command to proceed
	process.exit(0);
}

main();
