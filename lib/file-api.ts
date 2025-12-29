// File Server API Client
// Connects to Onpost-SaveFile server for image uploads

const FILE_SERVER_URL =
  process.env.NEXT_PUBLIC_FILE_SERVER_URL || "https://api.haluai.my.id";
const FILE_SERVER_API_KEY =
  process.env.FILE_SERVER_API_KEY || "onpost_file_api_k3y_2024_s3cur3";

export interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Upload an image to the file server
 * @param file - File to upload
 * @returns Upload response with image URL
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${FILE_SERVER_URL}/upload`, {
    method: "POST",
    headers: {
      "x-api-key": FILE_SERVER_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to upload image");
  }

  return response.json();
}

/**
 * Upload a base64 image to the file server
 * @param base64 - Base64 string (with or without data URL prefix)
 * @param filename - Original filename
 * @returns Upload response with image URL
 */
export async function uploadBase64Image(
  base64: string,
  filename: string = "image.jpg"
): Promise<UploadResponse> {
  // Convert base64 to blob
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const mimeType = base64.includes(",")
    ? base64.split(";")[0].split(":")[1]
    : "image/jpeg";

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Create file from blob
  const file = new File([blob], filename, { type: mimeType });

  return uploadImage(file);
}

/**
 * Delete an image from the file server
 * @param urlOrFilename - Full URL or just filename
 * @returns Delete response
 */
export async function deleteImage(
  urlOrFilename: string
): Promise<DeleteResponse> {
  // Extract filename from URL if needed
  const filename = urlOrFilename.includes("/")
    ? urlOrFilename.split("/").pop()
    : urlOrFilename;

  const response = await fetch(`${FILE_SERVER_URL}/images/${filename}`, {
    method: "DELETE",
    headers: {
      "x-api-key": FILE_SERVER_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to delete image");
  }

  return response.json();
}

/**
 * Get the full URL for an image
 * @param filename - Image filename
 * @returns Full image URL
 */
export function getImageUrl(filename: string): string {
  if (filename.startsWith("http")) {
    return filename;
  }
  return `${FILE_SERVER_URL}/images/${filename}`;
}

/**
 * Compress an image before upload
 * @param file - Original file
 * @param maxSize - Max width/height (default 1024)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  maxSize: number = 1024,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default {
  uploadImage,
  uploadBase64Image,
  deleteImage,
  getImageUrl,
  compressImage,
};
