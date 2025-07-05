import { Hono } from 'hono';
import type { Context } from 'hono';

import type { Env } from '../../types';
import { verifyJwt, verifyAdminAccess } from '../middleware/auth';

const upload = new Hono<{ Bindings: Env }>();

// Upload image to CloudFlare R2
upload.post('/image', verifyJwt, async (c: Context) => {
	try {
		console.log('Upload endpoint hit');
		const body = await c.req.parseBody();
		console.log('Body parsed:', Object.keys(body));
		
		const file = body.file as File;
		const folder = (body.folder as string) || 'general';
		const bucket = (body.bucket as string) || 'stargate-universe';

		console.log('File:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
		console.log('Folder:', folder, 'Bucket:', bucket);

		if (!file) {
			console.error('No file in request body');
			return c.json({ error: 'No file provided' }, 400);
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return c.json({ error: 'File must be an image' }, 400);
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return c.json({ error: 'File size must be less than 10MB' }, 400);
		}

		// Get CloudFlare R2 binding
		const r2 = c.env.R2_BUCKET;
		console.log('R2 binding available:', !!r2);
		if (!r2) {
			console.error('R2_BUCKET binding not found in environment');
			return c.json({ error: 'Storage service not configured' }, 500);
		}

		// Generate unique filename
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const fileExtension = file.name.split('.').pop() || 'jpg';
		const filename = `${timestamp}-${randomSuffix}.${fileExtension}`;
		const key = `${folder}/${filename}`;

		console.log('Generated key:', key);

		// Convert file to ArrayBuffer
		const arrayBuffer = await file.arrayBuffer();
		console.log('ArrayBuffer size:', arrayBuffer.byteLength);

		// Upload to R2
		console.log('Attempting R2 upload...');
		const putResult = await r2.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type,
				cacheControl: 'public, max-age=31536000', // 1 year cache
			},
			customMetadata: {
				originalName: file.name,
				uploadedAt: timestamp.toString(),
			},
		});
		console.log('R2 upload result:', putResult);

		// Construct public URL
		// Use custom domain if available, otherwise fall back to R2 dev domain
		const r2Domain = c.env.R2_PUBLIC_DOMAIN || `pub-${c.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev`;
		const publicUrl = `https://${r2Domain}/${bucket}/${key}`;

		return c.json({
			success: true,
			url: publicUrl,
			filename: filename,
			key: key,
		});
	} catch (error) {
		console.error('Upload error:', error);
		return c.json({ error: 'Upload failed' }, 500);
	}
});

// Delete image from CloudFlare R2
upload.delete('/image/:key', verifyJwt, async (c: Context) => {
	try {
		const key = decodeURIComponent(c.req.param('key'));

		if (!key) {
			return c.json({ error: 'No key provided' }, 400);
		}

		// Get CloudFlare R2 binding
		const r2 = c.env.R2_BUCKET;
		if (!r2) {
			console.error('R2_BUCKET binding not found in environment');
			return c.json({ error: 'Storage service not configured' }, 500);
		}

		// Check if object exists
		const object = await r2.head(key);
		if (!object) {
			return c.json({ error: 'File not found' }, 404);
		}

		// Delete from R2
		await r2.delete(key);

		return c.json({
			success: true,
			message: 'File deleted successfully',
		});
	} catch (error) {
		console.error('Delete error:', error);
		return c.json({ error: 'Delete failed' }, 500);
	}
});

export default upload;