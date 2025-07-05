import React, { useState, useRef, useCallback } from 'react';
import { Form, Alert, Button, Spinner } from 'react-bootstrap';
import { FaUpload, FaTrash, FaImage } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { uploadService, UploadResponse } from '../services/upload-service';

interface FileUploadProps {
	label: string;
	currentUrl?: string;
	onChange: (url: string | null) => void;
	folder?: string;
	accept?: string;
	helpText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
	label,
	currentUrl,
	onChange,
	folder = 'furniture',
	accept = 'image/*',
	helpText,
}) => {
	const [isUploading, setIsUploading] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
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
		// Reset the input value so the same file can be selected again if needed
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

	const handleRemove = useCallback(() => {
		onChange(null);
		setUploadError(null);
	}, [onChange]);

	const handleBrowseClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	return (
		<Form.Group className="mb-3">
			<Form.Label>{label}</Form.Label>
			
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
							border: '1px solid #dee2e6'
						}} 
					/>
					<div className="flex-grow-1">
						<small className="text-muted d-block">{currentUrl}</small>
						<Button 
							variant="outline-danger" 
							size="sm" 
							onClick={handleRemove}
							disabled={isUploading}
						>
							<FaTrash /> Remove
						</Button>
					</div>
				</div>
			)}

			{/* Upload Zone */}
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
				onClick={!isUploading ? handleBrowseClick : undefined}
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