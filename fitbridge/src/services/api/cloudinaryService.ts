/**
 * cloudinaryService.ts — Cloudinary media upload + pick + delete service.
 *
 * Security model:
 *   ✅ Uses UNSIGNED uploads with an upload preset — no API secret on device.
 *   ✅ API secret stays ONLY in fitbridge-api/.env (server-side signed ops).
 *   ✅ All uploads go through Cloudinary's CDN — no file data hits our backend.
 *   ✅ Deletion is proxied through fitbridge-api (requires signed request).
 *
 * Cloud: dzh5esait
 * Docs:  https://cloudinary.com/documentation/react_native_image_and_video_upload
 */

import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../../store/authStore';

const CLOUD_NAME    = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? 'dzh5esait';
const API_BASE_URL  = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

// ── Folder constants ──────────────────────────────────────────────────────────

/**
 * Canonical Cloudinary folder paths used across the FitBridge app.
 * Always use these constants — never hardcode folder strings.
 */
export const CLOUDINARY_FOLDERS = {
  AVATARS:        'fitbridge/avatars',
  SCAN_PHOTOS:    'fitbridge/scans',
  FEED_POSTS:     'fitbridge/feed',
  CHAT_MEDIA:     'fitbridge/chat',
  CERTIFICATIONS: 'fitbridge/certs',
} as const;

export type CloudinaryFolder = typeof CLOUDINARY_FOLDERS[keyof typeof CLOUDINARY_FOLDERS];

// ── Types ─────────────────────────────────────────────────────────────────────

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

/** @deprecated use CloudinaryFolder */ 
export type FitBridgeFolder = CloudinaryFolder;

export interface UploadOptions {
  folder?: CloudinaryFolder | string;
  resourceType?: CloudinaryResourceType;
  /** Quality override. Defaults to 'auto'. */
  quality?: number | string;
  /** Cloudinary fetch format (e.g., 'webp', 'jpg'). Defaults to 'auto'. */
  format?: string;
  /** Max width in px — Cloudinary resizes server-side. */
  maxWidth?: number;
  /** Called periodically during upload with 0–100 progress value. */
  onProgress?: (percent: number) => void;
}

export interface CloudinaryUploadResult {
  /** Full HTTPS CDN URL */
  secureUrl: string;
  /** Cloudinary public_id — needed to delete/transform later */
  publicId: string;
  /** Resource type returned by Cloudinary */
  resourceType: string;
  /** File size in bytes */
  bytes: number;
  /** Width in px (images/video only) */
  width?: number;
  /** Height in px (images/video only) */
  height?: number;
  /** Video duration in seconds (video only) */
  duration?: number;
  /** Cloudinary format (jpg, mp4, webp, …) */
  format: string;
}

// ── Core upload function ───────────────────────────────────────────────────────

/**
 * Uploads a local file URI to Cloudinary via backend proxy (SIGNED).
 * Works with images picked by expo-image-picker or expo-camera.
 */
export async function uploadToCloudinary(
  fileUri: string,
  options: UploadOptions = {},
): Promise<CloudinaryUploadResult> {
  const {
    folder = CLOUDINARY_FOLDERS.FEED_POSTS,
    resourceType = 'image',
    quality = 'auto',
    format = 'auto',
    onProgress,
  } = options;

  const formData = new FormData();

  // Determine MIME type from file extension
  const extension = fileUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',  webp: 'image/webp',
    gif: 'image/gif',  heic: 'image/heic',
    mp4: 'video/mp4',  mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  };
  const mimeType = mimeMap[extension] ?? 'image/jpeg';
  const fileName = `fitbridge_${Date.now()}.${extension}`;

  formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
  formData.append('folder', folder);
  formData.append('resourceType', resourceType);
  formData.append('quality', quality.toString());
  formData.append('fetch_format', format);

  const endpoint = `${API_BASE_URL}/media/upload`;
  const token = useAuthStore.getState().token;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          secureUrl:    response.secure_url,
          publicId:     response.public_id,
          resourceType: response.resource_type,
          bytes:        response.bytes,
          width:        response.width,
          height:       response.height,
          duration:     response.duration,
          format:       response.format,
        });
      } else {
        const err = JSON.parse(xhr.responseText);
        reject(new Error(err?.error?.message ?? `Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () =>
      reject(new Error('Network error during upload. Check your connection.')));
    xhr.addEventListener('abort', () =>
      reject(new Error('Upload cancelled.')));

    xhr.open('POST', endpoint);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

// ── Specialised upload helpers ─────────────────────────────────────────────────

/** Upload a FitFeed post image */
export const uploadPostImage = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { 
    folder: CLOUDINARY_FOLDERS.FEED_POSTS, 
    resourceType: 'image', 
    quality: 'auto:good',
    format: 'webp',
    onProgress 
  });

/** Upload a FitFeed reel / video */
export const uploadReel = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { 
    folder: CLOUDINARY_FOLDERS.FEED_POSTS, 
    resourceType: 'video', 
    quality: 'auto',
    onProgress 
  });

/** Upload a user avatar / profile photo */
export const uploadAvatar = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { folder: CLOUDINARY_FOLDERS.AVATARS, resourceType: 'image', onProgress });

/** Upload an AI body scan photo (front/back/side) */
export const uploadScanPhoto = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { 
    folder: CLOUDINARY_FOLDERS.SCAN_PHOTOS, 
    resourceType: 'image', 
    quality: 'auto',
    format: 'jpg',
    onProgress 
  });

/** Upload a brand campaign banner or asset */
export const uploadBrandAsset = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { folder: 'fitbridge/brands', resourceType: 'image', onProgress });

// ── URL transformation helpers ─────────────────────────────────────────────────

/**
 * Generates an optimised Cloudinary URL for display.
 * Cloudinary applies transformations on-the-fly — no pre-processing needed.
 *
 * @example
 *   getOptimisedUrl('fitbridge/posts/abc123', { width: 600, height: 600 })
 *   // → https://res.cloudinary.com/dzh5esait/image/upload/w_600,h_600,c_fill,q_auto,f_auto/fitbridge/posts/abc123
 */
export function getOptimisedUrl(
  publicId: string,
  transforms: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg';
    blur?: number;
    resourceType?: CloudinaryResourceType;
  } = {},
): string {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    blur,
    resourceType = 'image',
  } = transforms;

  const parts: string[] = [];
  if (width)   parts.push(`w_${width}`);
  if (height)  parts.push(`h_${height}`);
  if (width || height) parts.push(`c_${crop}`);
  parts.push(`q_${quality}`);
  parts.push(`f_${format}`);
  if (blur)    parts.push(`e_blur:${blur}`);

  const transformation = parts.join(',');
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${transformation}/${publicId}`;
}

/** Generate a thumbnail URL for a video reel */
export const getVideoThumbnail = (publicId: string, width = 400) =>
  getOptimisedUrl(publicId, { width, height: width * 1.25, crop: 'fill', resourceType: 'video', format: 'jpg' });

/** Generate a blurred placeholder for lazy loading */
export const getBlurPlaceholder = (publicId: string) =>
  getOptimisedUrl(publicId, { width: 20, height: 20, blur: 1000 });

/**
 * US-spelling alias of getOptimisedUrl — identical behaviour.
 * Use either; prefer this in new code.
 *
 * @example
 *   getOptimizedUrl('fitbridge/feed/abc123', { width: 400, quality: 'auto', format: 'auto' })
 *   // → https://res.cloudinary.com/dzh5esait/image/upload/w_400,q_auto,f_auto/fitbridge/feed/abc123
 */
export const getOptimizedUrl = getOptimisedUrl;

// ── Image / video picker helpers ──────────────────────────────────────────────

export interface PickedImage {
  uri: string;
  fileName: string;
  base64?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface PickedVideo {
  uri: string;
  fileName: string;
  duration?: number;
  mimeType?: string;
}

/**
 * Launch the device image library and return the selected image.
 * Requests media library permissions automatically.
 *
 * @param options.aspect           - Crop aspect ratio [w, h] (default: free)
 * @param options.quality          - Compression 0–1 (default: 0.85)
 * @param options.allowsMultiple   - Allow multi-select (default: false)
 * @param options.includeBase64    - Include base64 data (default: false)
 * @returns PickedImage or null if user cancelled / permission denied
 *
 * @example
 *   const img = await pickImage({ aspect: [1, 1], quality: 0.9 });
 *   if (img) await uploadToCloudinary(img.uri, { folder: CLOUDINARY_FOLDERS.AVATARS });
 */
export async function pickImage(options: {
  aspect?: [number, number];
  quality?: number;
  allowsMultiple?: boolean;
  includeBase64?: boolean;
} = {}): Promise<PickedImage | null> {
  const {
    aspect,
    quality = 0.85,
    allowsMultiple = false,
    includeBase64 = false,
  } = options;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[cloudinaryService.pickImage] Media library permission denied.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: !allowsMultiple,
    allowsMultipleSelection: allowsMultiple,
    aspect,
    quality,
    base64: includeBase64,
    exif: false, // strip EXIF to remove GPS data
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const ext   = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';

  return {
    uri:      asset.uri,
    fileName: asset.fileName ?? `fitbridge_img_${Date.now()}.${ext}`,
    base64:   asset.base64 ?? undefined,
    width:    asset.width,
    height:   asset.height,
    mimeType: asset.mimeType,
  };
}

/**
 * Launch the device video library and return the selected video.
 * Requests media library permissions automatically.
 *
 * @returns PickedVideo or null if user cancelled / permission denied
 *
 * @example
 *   const vid = await pickVideo();
 *   if (vid) await uploadToCloudinary(vid.uri, { folder: CLOUDINARY_FOLDERS.FEED_POSTS, resourceType: 'video' });
 */
export async function pickVideo(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[cloudinaryService.pickVideo] Media library permission denied.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'videos',
    allowsEditing: true,
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const ext   = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';

  return {
    uri:      asset.uri,
    fileName: asset.fileName ?? `fitbridge_vid_${Date.now()}.${ext}`,
    duration: asset.duration ?? undefined,
    mimeType: asset.mimeType,
  };
}

// ── Delete (server-proxied) ───────────────────────────────────────────────────

/**
 * Delete a Cloudinary asset by its public_id.
 *
 * ⚠️  Deletion requires a SIGNED request (uses API secret).
 *    This function delegates to the fitbridge-api backend which holds the
 *    secret securely.  The backend route is DELETE /api/media/:publicId.
 *
 * @param publicId - Cloudinary public_id (e.g. 'fitbridge/feed/abc123')
 * @param token    - Supabase JWT to authenticate with the backend
 *
 * @example
 *   await deleteFromCloudinary('fitbridge/avatars/user_xyz', session.access_token);
 */
export async function deleteFromCloudinary(
  publicId: string,
  token: string,
): Promise<void> {
  const encodedId = encodeURIComponent(publicId);

  const res = await fetch(`${API_BASE_URL}/media/${encodedId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.message ?? `Failed to delete asset (${res.status}): ${publicId}`,
    );
  }
}

// ── New folder-specific upload helpers ────────────────────────────────────────

/** Upload a chat media attachment (image or video) */
export const uploadChatMedia = (
  uri: string,
  resourceType: CloudinaryResourceType = 'image',
  onProgress?: (p: number) => void,
) => uploadToCloudinary(uri, { folder: CLOUDINARY_FOLDERS.CHAT_MEDIA, resourceType, onProgress });

/** Upload a trainer certification document / image */
export const uploadCertification = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { folder: CLOUDINARY_FOLDERS.CERTIFICATIONS, resourceType: 'image', onProgress });

/** Upload an AI body scan photo using the new canonical folder */
export const uploadBodyScan = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { folder: CLOUDINARY_FOLDERS.SCAN_PHOTOS, resourceType: 'image', onProgress });

/** Upload a FitFeed post image using the new canonical folder */
export const uploadFeedPost = (uri: string, onProgress?: (p: number) => void) =>
  uploadToCloudinary(uri, { folder: CLOUDINARY_FOLDERS.FEED_POSTS, resourceType: 'image', onProgress });

