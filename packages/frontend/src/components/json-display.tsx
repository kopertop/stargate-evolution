import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

// Add CSS for the JSON modal
const jsonModalStyles = `
	.json-modal .modal-content {
		background-color: #1e1e1e;
		border: 1px solid #404040;
	}
	
	.json-modal .btn-close {
		filter: invert(1) grayscale(100%) brightness(200%);
	}
	
	.json-modal .modal-header .btn-close:focus {
		box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.25);
	}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('json-modal-styles')) {
	const styleSheet = document.createElement('style');
	styleSheet.id = 'json-modal-styles';
	styleSheet.textContent = jsonModalStyles;
	document.head.appendChild(styleSheet);
}

interface JsonDisplayProps {
	value: any;
	maxPreviewLength?: number;
	style?: React.CSSProperties;
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ 
	value, 
	maxPreviewLength = 50,
	style = {},
}) => {
	const [showModal, setShowModal] = useState(false);
	
	if (value === null || value === undefined) {
		return <em className="text-muted">NULL</em>;
	}
	
	const stringValue = String(value);
	
	// Check if it's a JSON object/array
	const isJson = (stringValue.startsWith('{') && stringValue.endsWith('}')) || 
				   (stringValue.startsWith('[') && stringValue.endsWith(']'));
	
	if (!isJson) {
		return <code style={{ wordBreak: 'break-word', ...style }}>{stringValue}</code>;
	}
	
	let parsed: any;
	try {
		parsed = JSON.parse(stringValue);
	} catch (e) {
		// If it's not valid JSON, just show as code
		return <code style={{ wordBreak: 'break-word', ...style }}>{stringValue}</code>;
	}
	
	const preview = stringValue.length > maxPreviewLength 
		? `${stringValue.substring(0, maxPreviewLength)}...`
		: stringValue;
	
	return (
		<>
			<code 
				className="text-primary"
				style={{ 
					cursor: 'pointer', 
					wordBreak: 'break-word',
					textDecoration: 'underline',
					...style, 
				}}
				onClick={() => setShowModal(true)}
				title="Click to view formatted JSON"
			>
				{preview}
			</code>
			
			<Modal 
				show={showModal} 
				onHide={() => setShowModal(false)} 
				size="lg"
				centered
				className="json-modal"
			>
				<Modal.Header 
					closeButton 
					style={{ 
						backgroundColor: '#1e1e1e', 
						borderColor: '#404040',
						color: '#ffffff',
					}}
				>
					<Modal.Title style={{ fontFamily: 'monospace', fontSize: '1rem' }}>
						JSON Data
					</Modal.Title>
				</Modal.Header>
				<Modal.Body 
					style={{ 
						backgroundColor: '#1e1e1e', 
						padding: 0,
						maxHeight: '70vh',
						overflow: 'hidden',
					}}
				>
					<pre 
						style={{
							backgroundColor: '#1e1e1e',
							color: '#d4d4d4',
							margin: 0,
							padding: '1.5rem',
							fontSize: '0.875rem',
							lineHeight: '1.5',
							fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace',
							overflow: 'auto',
							maxHeight: '70vh',
							border: 'none',
							borderRadius: 0,
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word',
						}}
					>
						{formatJsonWithSyntaxHighlighting(parsed)}
					</pre>
				</Modal.Body>
				<Modal.Footer 
					style={{ 
						backgroundColor: '#1e1e1e', 
						borderColor: '#404040',
						justifyContent: 'space-between',
					}}
				>
					<small style={{ color: '#888', fontFamily: 'monospace' }}>
						{Object.keys(parsed).length} {Array.isArray(parsed) ? 'items' : 'properties'}
					</small>
					<div>
						<Button 
							variant="outline-light" 
							size="sm" 
							className="me-2"
							onClick={() => navigator.clipboard.writeText(JSON.stringify(parsed, null, 2))}
						>
							Copy JSON
						</Button>
						<Button variant="secondary" onClick={() => setShowModal(false)}>
							Close
						</Button>
					</div>
				</Modal.Footer>
			</Modal>
		</>
	);
};

// Simple syntax highlighting for JSON
const formatJsonWithSyntaxHighlighting = (obj: any): React.ReactNode => {
	const jsonString = JSON.stringify(obj, null, 2);
	
	// Split into lines and format each
	return jsonString.split('\n').map((line, index) => (
		<span key={index}>
			{formatJsonLine(line)}
			{index < jsonString.split('\n').length - 1 && '\n'}
		</span>
	));
};

const formatJsonLine = (line: string): React.ReactNode => {
	// Simple regex-based syntax highlighting
	const parts: React.ReactNode[] = [];
	let remaining = line;
	let key = 0;
	
	while (remaining.length > 0) {
		// String values (including keys)
		const stringMatch = remaining.match(/^(\s*)"([^"\\]*(\\.[^"\\]*)*)"/);
		if (stringMatch) {
			const [full, indent, content] = stringMatch;
			const isKey = remaining.charAt(full.length) === ':';
			parts.push(
				<span key={key++}>
					{indent}&quot;
					<span style={{ color: isKey ? '#9cdcfe' : '#ce9178' }}>
						{content}
					</span>
					&quot;
				</span>,
			);
			remaining = remaining.slice(full.length);
			continue;
		}
		
		// Numbers
		const numberMatch = remaining.match(/^(\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
		if (numberMatch) {
			const [full, indent, number] = numberMatch;
			parts.push(
				<span key={key++}>
					{indent}
					<span style={{ color: '#b5cea8' }}>{number}</span>
				</span>,
			);
			remaining = remaining.slice(full.length);
			continue;
		}
		
		// Booleans and null
		const boolNullMatch = remaining.match(/^(\s*)(true|false|null)/);
		if (boolNullMatch) {
			const [full, indent, value] = boolNullMatch;
			parts.push(
				<span key={key++}>
					{indent}
					<span style={{ color: '#569cd6' }}>{value}</span>
				</span>,
			);
			remaining = remaining.slice(full.length);
			continue;
		}
		
		// Structural characters
		const structMatch = remaining.match(/^(\s*)([{}[\],:])/);
		if (structMatch) {
			const [full, indent, char] = structMatch;
			parts.push(
				<span key={key++}>
					{indent}
					<span style={{ color: '#d4d4d4' }}>{char}</span>
				</span>,
			);
			remaining = remaining.slice(full.length);
			continue;
		}
		
		// Default: just take the first character
		parts.push(<span key={key++}>{remaining.charAt(0)}</span>);
		remaining = remaining.slice(1);
	}
	
	return <>{parts}</>;
};