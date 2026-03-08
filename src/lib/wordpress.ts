export async function uploadMediaToWP(wpUrl: string, wpUser: string, wpPass: string, base64Image: string, filename: string) {
  const auth = btoa(`${wpUser}:${wpPass}`);
  
  const res = await fetch(base64Image);
  const blob = await res.blob();
  
  const formData = new FormData();
  formData.append('file', blob, filename);
  
  const response = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to upload media to WP');
  }
  
  return response.json();
}

export async function getOrCreateCategory(wpUrl: string, wpUser: string, wpPass: string, categoryName: string) {
  const auth = btoa(`${wpUser}:${wpPass}`);
  
  // 1. Search for existing category
  const searchRes = await fetch(`${wpUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  
  if (searchRes.ok) {
    const categories = await searchRes.json();
    const existing = categories.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;
  }
  
  // 2. Create new category if not found
  const createRes = await fetch(`${wpUrl}/wp-json/wp/v2/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({ name: categoryName })
  });
  
  if (createRes.ok) {
    const newCat = await createRes.json();
    return newCat.id;
  }
  
  return null;
}

export async function postToWP(article: any, account: any, uploadImageToWp: boolean) {
  const { url: wpUrl, user: wpUser, pass: wpPass } = account;
  const auth = btoa(`${wpUser}:${wpPass}`);
  
  let featuredMediaId = null;
  
  if (uploadImageToWp && article.image && article.image.startsWith('data:image')) {
    try {
      const mediaRes = await uploadMediaToWP(wpUrl, wpUser, wpPass, article.image, `${article.slug}.png`);
      featuredMediaId = mediaRes.id;
    } catch (e) {
      console.error("Failed to upload featured image to WP", e);
    }
  }
  
  let categoryId = null;
  if (article.category) {
    try {
      categoryId = await getOrCreateCategory(wpUrl, wpUser, wpPass, article.category);
    } catch (e) {
      console.error("Failed to get/create category", e);
    }
  }

  const postData: any = {
    title: article.title,
    content: article.body,
    status: article.status.toLowerCase() === 'publish' ? 'publish' : article.status.toLowerCase() === 'draft' ? 'draft' : 'future',
    date: article.dateObj.toISOString(),
    excerpt: article.meta,
    slug: article.slug,
  };
  
  if (featuredMediaId) {
    postData.featured_media = featuredMediaId;
  }
  
  if (categoryId) {
    postData.categories = [categoryId];
  }
  
  const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(postData)
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to post to WordPress');
  }
  
  return response.json();
}

export async function testWPConnection(wpUrl: string, wpUser: string, wpPass: string) {
  const auth = btoa(`${wpUser}:${wpPass}`);
  const response = await fetch(`${wpUrl}/wp-json/wp/v2/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Koneksi gagal. Periksa URL, Username, atau Password.');
  }
  
  const data = await response.json();
  return data.name || data.slug || 'Connected';
}
