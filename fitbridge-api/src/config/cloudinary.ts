import { v2 as cloudinaryV2 } from 'cloudinary';
import { ENV } from './env';

let configured = false;

export function configureCloudinary(): void {
  if (!ENV.CLOUDINARY_CLOUD_NAME) {
    console.warn('⚠️  Cloudinary not configured — uploads will return placeholder URLs');
    return;
  }
  cloudinaryV2.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  console.log('☁️  Cloudinary configured');
}

export async function uploadToCloudinary(
  filePath: string,
  folder = 'fitbridge',
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<string> {
  if (!configured) {
    return `https://picsum.photos/seed/${Date.now()}/600/400`;
  }
  const result = await cloudinaryV2.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
}

export { cloudinaryV2 as cloudinary };
