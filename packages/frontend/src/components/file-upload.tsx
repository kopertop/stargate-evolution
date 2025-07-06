import React, { useState, useRef, useCallback } from 'react';
import { Form, Alert, Button, Spinner, ButtonGroup } from 'react-bootstrap';
import { FaUpload, FaTrash, FaImage, FaSearch, FaCloudUploadAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { uploadService, UploadResponse } from '../services/upload-service';

import FileTypeahead from './file-typeahead';

interface FileUploadProps {
	label?: string;
	currentUrl?: string;
	onChange: (url: string | null) => void;
	folder?: string;
	accept?: string;
	helpText?: string;
	thumbnailMode?: boolean;
	allowSelection?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
	label,
	currentUrl,
	onChange,
	folder = 'furniture',
	accept = 'image/*',
	helpText,
	thumbnailMode = false,
	allowSelection = true,
}) => {
	const [isUploading, setIsUploading] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [mode, setMode] = useState<'upload' | 'select'>('select');
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = useCallback(async (file: File) => {
		setIsUploading(true);
		setUploadError(null);

		try {
			const result: UploadResponse = await uploadService.uploadImage(file, folder);
			onChange(result.url);
			toast.success(`File uploaded successfully: ${result.filename}`);
		} catch (error: any) {
			const errorMessage = error.message || 'Upload failed';
			setUploadError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsUploading(false);
		}
	}, [folder, onChange]);

	const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [handleFileUpload]);

	const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragOver(false);

		const files = event.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (file.type.startsWith('image/')) {
				handleFileUpload(file);
			} else {
				setUploadError('Please select an image file');
				toast.error('Please select an image file');
			}
		}
	}, [handleFileUpload]);

	const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleClick = useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	}, []);

	if (typeof currentUrl !== 'string' && currentUrl !== undefined) {
		return <div className='alert alert-warning'>File upload is only available for single image URLs. Use the JSON editor for advanced image mapping.</div>;
	}

	if (thumbnailMode) {
		return (
			<div className="file-upload-thumbnail-container">
				{/* Mode Toggle for Thumbnail */}
				{allowSelection && (
					<ButtonGroup size="sm" className="mb-1 w-100">
						<Button
							variant={mode === 'upload' ? 'primary' : 'outline-primary'}
							onClick={() => setMode('upload')}
							size="sm"
							style={{ fontSize: '10px', padding: '2px 6px' }}
						>
							<FaCloudUploadAlt />
						</Button>
						<Button
							variant={mode === 'select' ? 'primary' : 'outline-primary'}
							onClick={() => setMode('select')}
							size="sm"
							style={{ fontSize: '10px', padding: '2px 6px' }}
						>
							<FaSearch />
						</Button>
					</ButtonGroup>
				)}

				{mode === 'select' ? (
					/* Thumbnail Select Mode */
					<FileTypeahead
						folder={folder}
						value={currentUrl}
						onChange={onChange}
						placeholder="Search files..."
					/>
				) : (
					/* Thumbnail Upload Mode */
					<div
						className={`file-upload-thumbnail-dropzone${isDragOver ? ' drag-over' : ''}`}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onClick={handleClick}
						style={{
							width: 80,
							height: 80,
							border: '2px dashed #aaa',
							borderRadius: 8,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: isDragOver ? '#f0f0f0' : '#fff',
							cursor: 'pointer',
							position: 'relative',
							overflow: 'hidden',
						}}
					>
						{isUploading ? (
							<span style={{ fontSize: '8px' }}>Uploading...</span>
						) : currentUrl ? (
							<img
								src={currentUrl}
								alt='Furniture'
								style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
							/>
						) : (
							<span style={{ color: '#888', fontSize: 32 }}>+</span>
						)}
						<input
							type='file'
							accept={accept}
							ref={fileInputRef}
							style={{ display: 'none' }}
							onChange={handleFileSelect}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<Form.Group className="mb-3">
			{label && (
				<div className="d-flex justify-content-between align-items-center mb-2">
					<Form.Label className="mb-0">{label}</Form.Label>
					{allowSelection && (
						<ButtonGroup size="sm">
							<Button
								variant={mode === 'upload' ? 'primary' : 'outline-primary'}
								onClick={() => setMode('upload')}
							>
								<FaCloudUploadAlt className="me-1" /> Upload
							</Button>
							<Button
								variant={mode === 'select' ? 'primary' : 'outline-primary'}
								onClick={() => setMode('select')}
							>
								<FaSearch className="me-1" /> Select
							</Button>
						</ButtonGroup>
					)}
				</div>
			)}

			{/* Current Image Preview */}
			{currentUrl && (
				<div className="mb-2 d-flex align-items-center gap-2">
					<img
						src={currentUrl}
						alt="Current"
						style={{
							width: '60px',
							height: '60px',
							objectFit: 'cover',
							borderRadius: '4px',
							border: '1px solid #dee2e6',
						}}
					/>
					<div className="flex-grow-1">
						<small className="text-muted d-block">{currentUrl}</small>
						<Button
							variant="outline-danger"
							size="sm"
							onClick={() => onChange(null)}
							disabled={isUploading}
						>
							<FaTrash /> Remove
						</Button>
					</div>
				</div>
			)}

			{/* Content Area */}
			{mode === 'select' ? (
				/* File Selection Mode */
				<FileTypeahead
					folder={folder}
					value={currentUrl}
					onChange={onChange}
					placeholder="Type to search uploaded files or paste URL..."
				/>
			) : (
				/* Upload Mode */
				<>
					<div
						className={`border rounded p-4 text-center ${
							isDragOver ? 'border-primary bg-light' : 'border-secondary'
						} ${isUploading ? 'bg-light' : ''}`}
						style={{
							cursor: isUploading ? 'not-allowed' : 'pointer',
							minHeight: '120px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
							transition: 'all 0.2s ease',
							backgroundColor: isDragOver ? 'rgba(13, 110, 253, 0.1)' : undefined,
						}}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onClick={!isUploading ? handleClick : undefined}
					>
						{isUploading ? (
							<>
								<Spinner animation="border" size="sm" className="mb-2" />
								<div>Uploading...</div>
							</>
						) : (
							<>
								<FaImage size={24} className="text-muted mb-2" />
								<div className="mb-1">
									<strong>
										{isDragOver ? 'Drop image here' : 'Drop image here or click to browse'}
									</strong>
								</div>
								<small className="text-muted">
									Supports JPG, PNG, GIF up to 10MB
								</small>
							</>
						)}
					</div>

					{/* Hidden File Input */}
					<input
						ref={fileInputRef}
						type="file"
						accept={accept}
						onChange={handleFileSelect}
						style={{ display: 'none' }}
						disabled={isUploading}
					/>
				</>
			)}

			{/* Help Text */}
			{helpText && (
				<Form.Text className="text-muted">
					{helpText}
				</Form.Text>
			)}

			{/* Error Display */}
			{uploadError && (
				<Alert variant="danger" className="mt-2 mb-0">
					{uploadError}
				</Alert>
			)}
		</Form.Group>
	);
};

export default FileUpload;
