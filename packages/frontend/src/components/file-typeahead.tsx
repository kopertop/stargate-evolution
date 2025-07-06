import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, Dropdown, Button, Spinner } from 'react-bootstrap';
import { FaCheck, FaTimes } from 'react-icons/fa';

import { uploadService, UploadedFile } from '../services/upload-service';

interface FileTypeaheadProps {
	label?: string;
	folder?: string;
	value?: string;
	onChange: (url: string | null) => void;
	placeholder?: string;
}

export const FileTypeahead: React.FC<FileTypeaheadProps> = ({
	label,
	folder = '',
	value = '',
	onChange,
	placeholder = 'Type to search files or paste URL...',
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Load files when component mounts or folder changes
	useEffect(() => {
		loadFiles();
	}, [folder]);

	// Set initial search term from value
	useEffect(() => {
		if (value && !searchTerm) {
			// If value is a URL, try to extract filename
			if (value.startsWith('http')) {
				const filename = value.split('/').pop() || value;
				setSearchTerm(filename);
			} else {
				setSearchTerm(value);
			}
		}
	}, [value, searchTerm]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const loadFiles = async () => {
		try {
			setLoading(true);
			setError(null);
			const fileList = await uploadService.listFiles(folder, 200);
			setFiles(fileList);
		} catch (err: any) {
			setError(err.message || 'Failed to load files');
			setFiles([]);
		} finally {
			setLoading(false);
		}
	};

	// Filter files based on search term
	const filteredFiles = useMemo(() => {
		if (!searchTerm.trim()) return files;
		
		const term = searchTerm.toLowerCase();
		return files.filter(file => 
			file.filename.toLowerCase().includes(term) ||
			file.originalName?.toLowerCase().includes(term) ||
			file.key.toLowerCase().includes(term),
		);
	}, [files, searchTerm]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setSearchTerm(newValue);
		
		// If input looks like a URL, update the value immediately
		if (newValue.startsWith('http')) {
			onChange(newValue);
		} else if (!newValue.trim()) {
			onChange(null);
		}
		
		setIsOpen(true);
	};

	const handleInputFocus = () => {
		setIsOpen(true);
	};

	const handleFileSelect = (file: UploadedFile) => {
		setSearchTerm(file.originalName || file.filename);
		onChange(file.url);
		setIsOpen(false);
	};

	const handleClear = () => {
		setSearchTerm('');
		onChange(null);
		setIsOpen(false);
		inputRef.current?.focus();
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}).format(new Date(date));
	};

	return (
		<div className="file-typeahead" ref={dropdownRef}>
			{label && <Form.Label>{label}</Form.Label>}
			
			<div className="position-relative">
				<Form.Control
					ref={inputRef}
					type="text"
					value={searchTerm}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					placeholder={placeholder}
					className={value ? 'is-valid' : ''}
				/>
				
				{/* Clear button */}
				{(searchTerm || value) && (
					<Button
						variant="link"
						size="sm"
						className="position-absolute top-50 end-0 translate-middle-y me-1 p-1"
						onClick={handleClear}
						style={{ zIndex: 5 }}
					>
						<FaTimes size={12} />
					</Button>
				)}

				{/* Valid indicator */}
				{value && (
					<div className="position-absolute top-50 end-0 translate-middle-y me-4">
						<FaCheck className="text-success" size={14} />
					</div>
				)}

				{/* Dropdown */}
				{isOpen && (
					<div 
						className="dropdown-menu show w-100 mt-1" 
						style={{ 
							maxHeight: '300px', 
							overflowY: 'auto',
							zIndex: 1050, 
						}}
					>
						{loading ? (
							<div className="dropdown-item text-center">
								<Spinner animation="border" size="sm" className="me-2" />
								Loading files...
							</div>
						) : error ? (
							<div className="dropdown-item text-danger">
								Error: {error}
							</div>
						) : filteredFiles.length === 0 ? (
							<div className="dropdown-item text-muted">
								{searchTerm ? `No files found matching "${searchTerm}"` : 'No files available'}
							</div>
						) : (
							filteredFiles.map((file) => (
								<button
									key={file.key}
									type="button"
									className="dropdown-item d-flex align-items-center"
									onClick={() => handleFileSelect(file)}
								>
									<img
										src={file.url}
										alt={file.filename}
										style={{
											width: '40px',
											height: '40px',
											objectFit: 'cover',
											borderRadius: '4px',
											marginRight: '10px',
											border: '1px solid #dee2e6',
										}}
									/>
									<div className="flex-grow-1">
										<div className="fw-bold small">{file.originalName || file.filename}</div>
										<div className="text-muted small">
											{formatFileSize(file.size)} • {formatDate(file.lastModified)}
										</div>
									</div>
								</button>
							))
						)}
						
						{/* Show option to refresh files */}
						{!loading && (
							<div className="dropdown-divider" />
						)}
						{!loading && (
							<button
								type="button"
								className="dropdown-item text-primary small"
								onClick={loadFiles}
							>
								↻ Refresh file list
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default FileTypeahead;