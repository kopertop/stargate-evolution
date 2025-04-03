const fs = require('fs');
const path = require('path');

// Directories to check (adjust these as needed)
const DIRS_TO_CHECK = [
	'src/systems',
	'src/components',
	'src/screens',
];

// Files with .ts or .tsx extensions
const FILE_EXTENSIONS = ['.ts', '.tsx'];

// Function to recursively get all files in a directory
function getAllFiles(dir, fileList = []) {
	const files = fs.readdirSync(dir);

	files.forEach(file => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			getAllFiles(filePath, fileList);
		} else if (FILE_EXTENSIONS.includes(path.extname(file))) {
			fileList.push(filePath);
		}
	});

	return fileList;
}

// Function to find case statements that need to be fixed
function findCaseDeclarations(code) {
	const caseRegex = /case\s+(['"])?([\w-]+)\1?:((?!\{)[\s\S]*?)(?=\s*(?:case|default|break|return|}))/g;
	const declarationRegex = /\s*(const|let|var)\s+/;

	let matches = [];
	let match;

	while ((match = caseRegex.exec(code)) !== null) {
		const caseBody = match[3];
		if (declarationRegex.test(caseBody)) {
			matches.push({
				index: match.index,
				length: match[0].length,
				content: match[0],
				caseLabel: match[2],
			});
		}
	}

	return matches;
}

// Function to fix the file
function fixFile(filePath) {
	let fileContent = fs.readFileSync(filePath, 'utf8');
	const matches = findCaseDeclarations(fileContent);

	if (matches.length === 0) {
		return false; // No changes needed
	}

	// Fix in reverse order to avoid index shifts
	matches.reverse().forEach(match => {
		// Split the case content at the colon
		const colonIndex = match.content.indexOf(':');
		const beforeColon = match.content.substring(0, colonIndex + 1);
		const afterColon = match.content.substring(colonIndex + 1);

		// Replace the content with braces
		const newContent = `${beforeColon} {${afterColon}}`;

		fileContent = fileContent.substring(0, match.index) +
			newContent +
			fileContent.substring(match.index + match.length);
	});

	fs.writeFileSync(filePath, fileContent);
	return true; // File was changed
}

// Main function
function main() {
	let totalFilesChanged = 0;

	DIRS_TO_CHECK.forEach(dir => {
		const dirPath = path.join(process.cwd(), dir);
		if (!fs.existsSync(dirPath)) {
			console.log(`Directory does not exist: ${dirPath}`);
			return;
		}

		const files = getAllFiles(dirPath);

		console.log(`Checking ${files.length} files in ${dir}...`);

		files.forEach(file => {
			const wasChanged = fixFile(file);
			if (wasChanged) {
				totalFilesChanged++;
				console.log(`Fixed lexical declarations in case blocks: ${file}`);
			}
		});
	});

	console.log(`Done! Fixed ${totalFilesChanged} files.`);
}

main();
