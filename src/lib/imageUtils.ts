import { AppSettings } from '../types';
import { uploadMediaToWP } from './wordpress';

export async function uploadImage(base64Data: string, settings: AppSettings, filename: string = 'image.png'): Promise<string> {
  // 1. Try ImageKit
  if (settings.ikUrl && settings.ikPrivateKey) {
    try {
      const formData = new FormData();
      formData.append("file", base64Data);
      formData.append("fileName", filename);

      const res = await fetch(settings.ikUrl, {
        method: "POST",
        headers: { "Authorization": "Basic " + btoa(settings.ikPrivateKey + ":") },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
      console.error("ImageKit upload failed", await res.text());
    } catch (e) {
      console.error("ImageKit error", e);
    }
  }

  // 2. Try WordPress (if enabled and accounts exist)
  if (settings.uploadImageToWp && settings.wpAccounts.length > 0) {
    // Use the first account for media library storage
    const account = settings.wpAccounts[0];
    try {
      const media = await uploadMediaToWP(account.url, account.user, account.pass, base64Data, filename);
      if (media.source_url) return media.source_url;
    } catch (e) {
      console.error("WP upload error", e);
    }
  }

  // 3. Fallback
  // Return a placeholder to avoid base64 strings which are too large for Google Sheets
  return "https://via.placeholder.com/800x400?text=Image+Upload+Failed";
}
