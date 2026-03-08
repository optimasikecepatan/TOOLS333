export async function uploadToImageKit(base64Image: string, filename: string, ikUrl: string, ikPrivateKey: string) {
  const res = await fetch(base64Image);
  const blob = await res.blob();
  
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("fileName", filename);
  
  const response = await fetch(ikUrl, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(ikPrivateKey + ":")
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload to ImageKit');
  }
  
  return response.json();
}
