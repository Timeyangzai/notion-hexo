const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 获取书签的元信息。
 * @param {string} url 目标 URL。
 * @returns {Promise<Object>} 包含 title、description、cover、favicon 和 url 的对象。
 */
async function bookmark(url) {
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const metaTags = $('head').find('meta');
    const metas = {};

    metaTags.each((_, e) => {
      const name = $(e).attr('name') || $(e).attr('property');
      if (name) metas[name.toLowerCase()] = $(e).attr('content');
    });

    const title = metas['og:title'] || metas['twitter:title'] || $('title').text();
    const description = metas['og:description'] || metas['twitter:description'] || metas['description'] || '';
    const cover = metas['og:image'] || metas['twitter:image'] || metas['image'] || '';
    let favicon = $('link[rel="shortcut icon"]').attr('href') || $('link[rel="icon"]').attr('href') || '';

    if (favicon.startsWith('//')) favicon = 'https:' + favicon;
    if (favicon.startsWith('/')) favicon = 'https://' + new URL(url).hostname + favicon;

    return { title, description, cover, favicon, url };
  } catch (err) {
    console.warn('Error fetching bookmark:', err);
    return {
      title: new URL(url).hostname,
      description: '',
      cover: '',
      favicon: '',
      url,
    };
  }
}

/**
 * 替换文章中的书签占位符。
 * @param {string} content 文章内容。
 * @returns {Promise<string>} 替换后的文章内容。
 */
async function replaceBookmarks(content) {
    const bookmarkRegex = /<a href="([^"]+)">bookmark<\/a>/g;
    let match;
    let updatedContent = content;
  
    // 遍历每个匹配的书签
    while ((match = bookmarkRegex.exec(content)) !== null) {
      const url = match[1];
      // 等待每个 `bookmark` 请求完成后再替换
      const data = await bookmark(url);  // 等待获取数据
      console.log('Bookmark data:', data);
      const replacement = generateBookmarkHTML(data);  // 生成替换内容
      updatedContent = updatedContent.replace(match[0], replacement);  // 执行替换
    }
  
    return updatedContent;  // 返回更新后的内容
  }
  

/**
 * 根据书签数据生成 HTML。
 * @param {Object} data 书签数据。
 * @returns {string} 书签 HTML。
 */
function generateBookmarkHTML(data) {
  const { title, description, cover, favicon, url } = data;

  return `
    <div class="bookmark" style="margin: 10px 0;">
      <a href="${url}" target="_blank" style="display: flex; text-decoration: none; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;">
        <div style="flex-grow: 1; padding: 10px;">
          <h4 style="margin: 0; font-size: 16px;">${title}</h4>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">${description}</p>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${favicon ? `<img src="${favicon}" alt="favicon" style="width: 16px; height: 16px;">` : ''}
            <span style="font-size: 12px; color: #999;">${url}</span>
          </div>
        </div>
        ${cover ? `<div style="flex-shrink: 0; width: 120px; background: url(${cover}) no-repeat center/cover;"></div>` : ''}
      </a>
    </div>
  `;
}

module.exports = { bookmark, replaceBookmarks };
