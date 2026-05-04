/**
 * useImageUpload.ts — React hook for pick → upload → progress → URL
 *
 * Wraps expo-image-picker + cloudinaryService into a single hook.
 * Handles permissions, picking, uploading, progress, and errors.
 *
 * Prerequisites:
 *   npx expo install expo-image-picker
 *
 * Usage:
 *   const { pickAndUpload, uploading, progress, result, error, reset } = useImageUpload();
 *
 *   // Pick from gallery + upload as post image:
 *   const url = await pickAndUpload('post');
 *
 *   // Pick from camera + upload as avatar:
 *   const url = await pickAndUpload('avatar', { source: 'camera' });
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  uploadPostImage,
  uploadAvatar,
  uploadReel,
  uploadScanPhoto,
  uploadBrandAsset,
  type CloudinaryUploadResult,
} from '../services/api/cloudinaryService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadContext = 'post' | 'avatar' | 'reel' | 'scan' | 'brand';

export interface UseImageUploadOptions {
  /** 'library' (default) or 'camera' */
  source?: 'library' | 'camera';
  /** Allow multiple selection (library only) */
  allowsMultipleSelection?: boolean;
  /** Aspect ratio for crop [width, height]. Defaults to free crop. */
  aspect?: [number, number];
  /** Max quality 0–1. Defaults to 0.85. */
  quality?: number;
  /** Called when upload completes successfully */
  onSuccess?: (result: CloudinaryUploadResult) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseImageUploadReturn {
  /** Trigger picker + upload. Returns the secure CDN URL on success, null on cancel/error. */
  pickAndUpload: (context: UploadContext, options?: UseImageUploadOptions) => Promise<string | null>;
  /** True while upload is in progress */
  uploading: boolean;
  /** 0–100 upload progress percentage */
  progress: number;
  /** Last successful upload result */
  result: CloudinaryUploadResult | null;
  /** Last error message, or null */
  error: string | null;
  /** Reset state (clear result + error) */
  reset: () => void;
}

// ── Uploader map ──────────────────────────────────────────────────────────────

const uploaders: Record<UploadContext, (uri: string, onProgress: (p: number) => void) => Promise<CloudinaryUploadResult>> = {
  post:   (uri, onProgress) => uploadPostImage(uri, onProgress),
  avatar: (uri, onProgress) => uploadAvatar(uri, onProgress),
  reel:   (uri, onProgress) => uploadReel(uri, onProgress),
  scan:   (uri, onProgress) => uploadScanPhoto(uri, onProgress),
  brand:  (uri, onProgress) => uploadBrandAsset(uri, onProgress),
};

const mediaTypes: Record<UploadContext, ImagePicker.MediaType> = {
  post:   'images',
  avatar: 'images',
  reel:   'videos',
  scan:   'images',
  brand:  'images',
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<CloudinaryUploadResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const pickAndUpload = useCallback(async (
    context: UploadContext,
    options: UseImageUploadOptions = {},
  ): Promise<string | null> => {
    const {
      source = 'library',
      allowsMultipleSelection = false,
      aspect,
      quality = 0.85,
      onSuccess,
      onError,
    } = options;

    setError(null);
    setProgress(0);

    try {
      // ── 1. Request permissions ───────────────────────────────────────────────
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission denied. Enable it in Settings.');
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Photo library permission denied. Enable it in Settings.');
        }
      }

      // ── 2. Launch picker ─────────────────────────────────────────────────────
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: mediaTypes[context],
        allowsEditing: !allowsMultipleSelection,
        allowsMultipleSelection,
        aspect,
        quality,
        exif: false, // strip EXIF to remove location data
      };

      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (picked.canceled || !picked.assets?.length) {
        return null; // user cancelled — not an error
      }

      const asset = picked.assets[0];

      // ── 3. Upload ────────────────────────────────────────────────────────────
      setUploading(true);
      const uploadFn = uploaders[context];
      const uploadResult = await uploadFn(asset.uri, (p) => setProgress(p));

      setResult(uploadResult);
      onSuccess?.(uploadResult);
      return uploadResult.secureUrl;

    } catch (err: any) {
      const message = err?.message ?? 'Upload failed. Please try again.';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { pickAndUpload, uploading, progress, result, error, reset };
}
