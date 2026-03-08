export async function postToBlogger(article: any, account: any, status: string) {
  const { blogId: bloggerId, token: bloggerToken } = account;
  
  const postData: any = {
    kind: "blogger#post",
    blog: { id: bloggerId },
    title: article.title,
    content: article.body,
    published: article.dateObj.toISOString()
  };
  
  if (article.category) {
    postData.labels = [article.category];
  }
  
  const isDraft = status === 'draft';
  
  const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${bloggerId}/posts${isDraft ? '?isDraft=true' : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bloggerToken}`
    },
    body: JSON.stringify(postData)
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to post to Blogger');
  }
  
  return response.json();
}

export async function testBloggerConnection(bloggerId: string, bloggerToken: string) {
  const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${bloggerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bloggerToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Koneksi gagal. Periksa Blog ID atau Token.');
  }
  
  const data = await response.json();
  return data.name || 'Connected';
}
