import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
   api_key: process.env.CLOUDINARY_API_KEY!,
   api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export { cloudinary };

export async function deleteImage(publicId: string): Promise<void> {
   await cloudinary.uploader.destroy(publicId);
}

export function generateUploadSignature(folder: string): {
   signature: string;
   timestamp: number;
   folder: string;
   apiKey: string;
   cloudName: string;
} {
   const timestamp = Math.round(Date.now() / 1000);
   const folderPath = `artfolio/${folder}`;

   const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: folderPath },
      process.env.CLOUDINARY_API_SECRET!,
   );

   return {
      signature,
      timestamp,
      folder: folderPath,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
   };
}

export async function getImageColors(
   publicId: string,
): Promise<{ hex: string; weight: number }[]> {
   try {
      const result = (await cloudinary.api.resource(publicId, {
         colors: true,
      })) as { colors?: [string, number][] };

      return (result.colors ?? []).map(([hex, weight]) => ({ hex, weight }));
   } catch {
      return [];
   }
}
