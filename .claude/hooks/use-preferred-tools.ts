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

interface CommandMapping {
	pattern: RegExp;
	preferred: string;
	description: string;
}

// Define the command mappings
const COMMAND_MAPPINGS: CommandMapping[] = [
	{
		pattern: /\b(npm|bun|yarn)\b/g,
		preferred: 'pnpm',
		description: 'Use pnpm instead of npm/bun/yarn for better performance and disk usage',
	},
	{
		pattern: /\b(grep|rg|find)\b/g,
		preferred: 'ack',
		description: 'Use ack instead of grep/rg/find for better code searching',
	},
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

function validateCommand(command: string): string[] {
	const issues: string[] = [];

	for (const mapping of COMMAND_MAPPINGS) {
		if (mapping.pattern.test(command)) {
			// Create a suggested replacement
			const suggestedCommand = command.replace(mapping.pattern, mapping.preferred);
			issues.push(`${mapping.description}\nSuggested: ${suggestedCommand}`);
		}
	}

	return issues;
}

function main() {
	const input = parseInput();

	// Only process Bash tool calls
	if (input.tool_name !== 'Bash' || !input.tool_input.command) {
		process.exit(0);
	}

	const command = input.tool_input.command;
	const issues = validateCommand(command);

	if (issues.length > 0) {
		// Output issues to stderr for Claude to process
		for (const issue of issues) {
			console.error(`• ${issue}`);
		}
		// Exit code 2 blocks the tool call and shows stderr to Claude
		process.exit(2);
	}

	// No issues found, allow the command to proceed
	process.exit(0);
}

main();
