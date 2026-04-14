import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadToCloudinary(
  file: Buffer,
  options: { folder?: string; resource_type?: 'image' | 'video' | 'auto' } = {}
) {
  return new Promise<{ url: string; publicId: string; type: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        options.folder ?? 'draftbox',
          resource_type: options.resource_type ?? 'auto',
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({
            url:      result.secure_url,
            publicId: result.public_id,
            type:     result.resource_type,
          });
        }
      );
      stream.end(file);
    }
  );
}

export { cloudinary };