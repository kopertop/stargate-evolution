const fs = require('fs');
const path = require('path');

// Directories to exclude from search
const excludeDirs = ['node_modules', '.git', 'build', 'dist', '.expo'];

// File extensions to check
const includeExtensions = ['.js', '.jsx', '.ts', '.tsx'];

// Import patterns to search for
const importPatterns = [
	/import\s+{\s*v4\s+as\s+uuidv4\s*}\s+from\s+['"]uuid['"];?/g,
	/import\s+uuidv4\s+from\s+['"]uuid\/v4['"];?/g,
	/import\s+{\s*v4\s*}\s+from\s+['"]uuid['"];?/g,
	/import\s+\*\s+as\s+uuid\s+from\s+['"]uuid['"];?/g,
	/const\s+uuidv4\s+=\s+require\(['"]uuid\/v4['"]\);?/g,
	/const\s+{\s*v4(:|\s+as\s+uuidv4)?\s*}\s+=\s+require\(['"]uuid['"]\);?/g,
];

// Replacement for uuid imports
const idGeneratorImport = 'import { generateId, generateEntityId } from \'../utils/id-generator\';';

// Finding all relevant files
function findFiles(dir, filelist = []) {
	const files = fs.readdirSync(dir);

	files.forEach(file => {
		if (excludeDirs.includes(file)) return;

		const filepath = path.join(dir, file);
		const stat = fs.statSync(filepath);

		if (stat.isDirectory()) {
			filelist = findFiles(filepath, filelist);
		} else {
			const ext = path.extname(file);
			if (includeExtensions.includes(ext)) {
				filelist.push(filepath);
			}
		}
	});

	return filelist;
}

// Check a file for uuid imports and usages
function processFile(filepath) {
	console.log(`Checking: ${filepath}`);
	let fileContent = fs.readFileSync(filepath, 'utf8');
	let hasUuidImport = false;

	// Check for uuid imports
	for (const pattern of importPatterns) {
		if (pattern.test(fileContent)) {
			hasUuidImport = true;
			fileContent = fileContent.replace(pattern, idGeneratorImport);
		}
	}

	// If there was an import, check and replace usages
	if (hasUuidImport) {
		console.log(`  Found uuid import in: ${filepath}`);

		// Replace all uuid usage patterns
		fileContent = fileContent.replace(/uuidv4\(\)/g, 'generateId()');
		fileContent = fileContent.replace(/uuid\.v4\(\)/g, 'generateId()');

		// Special case for object IDs
		const idAssignmentPattern = /id:\s*uuidv4\(\)/g;

		// Try to determine the entity type from filename or context
		const filename = path.basename(filepath, path.extname(filepath));
		let entityType = 'entity';

		// Check if filename has a specific pattern like xxx-system.ts
		if (filename.includes('-system')) {
			entityType = filename.split('-')[0];
		} else if (filename.includes('-')) {
			entityType = filename.split('-')[0];
		}

		// Replace with entity type-aware ID generation
		fileContent = fileContent.replace(idAssignmentPattern, `id: generateEntityId('${entityType}')`);

		// Save the updated file
		fs.writeFileSync(filepath, fileContent, 'utf8');
		console.log(`  Updated imports and usage in: ${filepath}`);
		return true;
	}

	return false;
}

// Main function
function main() {
	const srcDirectory = path.join(__dirname, '..', 'src');
	console.log(`Searching for uuid imports in: ${srcDirectory}`);

	const files = findFiles(srcDirectory);
	console.log(`Found ${files.length} files to check`);

	let updatedCount = 0;

	files.forEach(file => {
		const updated = processFile(file);
		if (updated) {
			updatedCount++;
		}
	});

	console.log(`Completed! Updated ${updatedCount} files.`);
}

main();
