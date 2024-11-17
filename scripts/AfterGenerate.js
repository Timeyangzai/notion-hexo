const { replaceBookmarks } = require('./CustomTransformer');

// 在 after_post_render 钩子中执行异步操作
hexo.extend.filter.register('after_post_render', async (data) => {
  try {
    // 获取文章内容
    let content = data.content;
    if (!content) return data;

    // 替换书签数据，等待 replaceBookmarks 完成
    const updatedContent = await replaceBookmarks(content);

    // 更新文章内容
    data.content = updatedContent;

    // 返回修改后的文章数据
    return data;
  } catch (error) {
    console.error('Error processing bookmarks:', error);
    return data;  // 即使出错也要返回原始数据，以防止 Hexo 停止生成
  }
});
