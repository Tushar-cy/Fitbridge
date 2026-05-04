import express, { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabaseAdmin';

const router = express.Router();
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/media/upload
 * 
 * Proxies uploads to Cloudinary via backend (SIGNED upload).
 * Solves the "upload preset not found" error for users without unsigned presets.
 */
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: 'No file uploaded' } });
  }

  const folder = req.body.folder || 'fitbridge/misc';
  const resourceType = req.body.resourceType || 'auto';

  try {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: resourceType,
      quality: req.body.quality || 'auto',
      fetch_format: req.body.fetch_format || 'auto',
    });

    return res.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      format: result.format,
    });
  } catch (err: any) {
    console.error('[POST /api/media/upload] Cloudinary error:', err);
    return res.status(500).json({
      error: { message: err.message || 'Internal server error during upload' },
    });
  }
});

// Cloudinary is configured once at startup via ENV vars in server.ts / config/env.ts
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

/**
 * DELETE /api/media/:publicId
 *
 * Deletes a Cloudinary asset by its public_id.
 * Requires a valid Supabase JWT (authenticateToken middleware).
 *
 * The public_id is URL-encoded in the path, e.g.:
 *   DELETE /api/media/fitbridge%2Favatars%2Fabc123
 *
 * Security:
 *   - Only authenticated users can delete assets.
 *   - Ownership check ensures the publicId belongs to req.user.id
 */
router.delete('/*publicId', authenticate, async (req: Request, res: Response) => {
  const rawId = req.params.publicId;
  const publicId = decodeURIComponent(Array.isArray(rawId) ? rawId[0] : rawId);
  const userId = req.user!.id;

  if (!publicId || publicId.length < 3) {
    return res.status(400).json({ success: false, message: 'Invalid publicId' });
  }

  // Guard: publicId must start with 'fitbridge/' to prevent deleting foreign assets
  if (!publicId.startsWith('fitbridge/')) {
    return res.status(403).json({
      success: false,
      message: 'Can only delete assets in the fitbridge/ folder.',
    });
  }

  // 1. Check if this asset is owned by the requesting user
  const pathParts = publicId.split('/');
  const ownerIdInPath = pathParts[2]; // e.g., 'fitbridge/avatars/{userId}/filename'
  
  let isOwned = false;
  let dbMediaType: string | null = null;

  if (ownerIdInPath === userId) {
    isOwned = true;
  }

  // Fallback: check DB if path doesn't embed userId, and fetch media_type for resource_type
  if (!isOwned || !dbMediaType) {
    const { data: posts } = await supabaseAdmin
      .from('feed_posts')
      .select('id, media_urls, media_type')
      .eq('author_id', userId);

    if (posts) {
      const matchedPost = posts.find((p: any) => p.media_urls?.some((url: string) => url.includes(publicId)));
      if (matchedPost) {
        isOwned = true;
        dbMediaType = matchedPost.media_type;
      }
    }
  }
  
  if (!isOwned) {
    return res.status(403).json({ success: false, message: 'You do not own this media asset' });
  }

  try {
    // 2. Safe to delete. Determine resource_type.
    // Use DB media_type if available, otherwise fallback to extensions/folder names
    const isVideo = dbMediaType === 'video' || publicId.includes('/reels/') || publicId.endsWith('.mp4') || publicId.endsWith('.mov');
    const resourceType = isVideo ? 'video' : 'image';

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // purge from CDN cache
    });

    if (result.result === 'ok' || result.result === 'not found') {
      return res.json({ success: true, result: result.result });
    }

    return res.status(500).json({
      success: false,
      message: `Cloudinary deletion failed: ${result.result}`,
    });
  } catch (err: any) {
    console.error('[DELETE /api/media] Cloudinary error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message ?? 'Internal server error during deletion',
    });
  }
});

export default router;
