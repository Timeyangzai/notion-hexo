const {
  replaceBookmark,
  replaceLinkPreview,
  replaceVideo,
  replaceEmbed,
} = require("./CustomTransformer");

// 在 after_post_render 钩子中执行异步操作
hexo.extend.filter.register("after_post_render", async (data) => {
  try {
    // 获取文章内容
    let content = data.content;
    if (!content) return data;

    // 替换书签数据，等待 all replace 完成
    const updated_bookmark_Content = await replaceBookmark(content);

    const updated_linkpreview_Content = await replaceLinkPreview(
      updated_bookmark_Content
    );

    const updated_video_Content = await replaceVideo(
      updated_linkpreview_Content
    );

    const updated_embed_Content = await replaceEmbed(updated_video_Content);

    // 更新文章内容
    data.content = updated_embed_Content;

    // 返回修改后的文章数据
    return data;
  } catch (error) {
    console.error("Error processing bookmarks:", error);
    return data; // 即使出错也要返回原始数据，以防止 Hexo 停止生成
  }
});
