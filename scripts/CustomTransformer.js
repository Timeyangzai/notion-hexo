const axios = require("axios");
const cheerio = require("cheerio");

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

var CAPTION_DIV_TEMPLATE = `<div style="text-align: center; margin:0;"><p>{{caption}}</p></div>`;

// bookmark
/**
 * 获取书签的元信息。
 * @param {string} url 目标 URL。
 * @returns {Promise<Object>} 包含 title、description、cover、favicon 和 url 的对象。
 */
async function bookmark(url) {
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const metaTags = $("head").find("meta");
    const metas = {};

    metaTags.each((_, e) => {
      const name = $(e).attr("name") || $(e).attr("property");
      if (name) metas[name.toLowerCase()] = $(e).attr("content");
    });

    const title =
      metas["og:title"] || metas["twitter:title"] || $("title").text();
    const description =
      metas["og:description"] ||
      metas["twitter:description"] ||
      metas["description"] ||
      "";
    const cover =
      metas["og:image"] || metas["twitter:image"] || metas["image"] || "";
    let favicon =
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="icon"]').attr("href") ||
      "";

    if (favicon.startsWith("//")) favicon = "https:" + favicon;
    if (favicon.startsWith("/"))
      favicon = "https://" + new URL(url).hostname + favicon;

    return { title, description, cover, favicon, url };
  } catch (err) {
    console.warn("Error fetching bookmark:", err);
    return {
      title: new URL(url).hostname,
      description: "",
      cover: "",
      favicon: "",
      url,
    };
  }
}
/**
 * 替换文章中的书签占位符。
 * @param {string} content 文章内容。
 * @returns {Promise<string>} 替换后的文章内容。
 */
async function replaceBookmark(content) {
  const bookmarkRegex = /<a href="([^"]+)">bookmark<\/a>/g;
  let match;
  let updatedContent = content;

  // 遍历每个匹配的书签
  while ((match = bookmarkRegex.exec(content)) !== null) {
    const url = match[1];
    // 等待每个 `bookmark` 请求完成后再替换
    const data = await bookmark(url); // 等待获取数据
    console.log("Bookmark data:", data);
    const replacement = generateBookmarkHTML(data); // 生成替换内容
    updatedContent = updatedContent.replace(match[0], replacement); // 执行替换
  }

  return updatedContent; // 返回更新后的内容
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
            ${
              favicon
                ? `<img src="${favicon}" alt="favicon" style="width: 16px; height: 16px;">`
                : ""
            }
            <span style="font-size: 12px; color: #999;">${url}</span>
          </div>
        </div>
        ${
          cover
            ? `<div style="flex-shrink: 0; width: 120px; background: url(${cover}) no-repeat center/cover;"></div>`
            : ""
        }
      </a>
    </div>
  `;
}

// link preview
async function replaceLinkPreview(content) {
  const linkPreviewRegex = /<a href="([^"]+)">link_preview<\/a>/g;
  let match;
  let transformedContent = content;

  while ((match = linkPreviewRegex.exec(content)) !== null) {
    const url = match[1];
    let newHtml = "";
    try {
      const hostname = new URL(url).hostname;
      switch (hostname) {
        case "github.com":
          newHtml = await _link_preview_github(url);
          break;
        default:
          console.warn(`Unsupported domain for link_preview: ${hostname}`);
          break;
      }
    } catch (err) {
      console.error("Error parsing URL in link preview:", err);
    }

    // 替换匹配到的部分
    if (newHtml) {
      transformedContent = transformedContent.replace(match[0], newHtml);
    }
  }
  return transformedContent;
}
/**
 *
 * @param {string} url
 * @returns
 */
async function _link_preview_github(url) {
  /**
   * url example:
   * https://github.com/Doradx, home page
   * https://github.com/Doradx/CNKI-PDF-RIS-Helper, repo page
   * https://github.com/Doradx/CNKI-PDF-RIS-Helper/issues, issues list page
   * https://github.com/Doradx/CNKI-PDF-RIS-Helper/issues/2, issue page
   * https://github.com/Doradx/CNKI-PDF-RIS-Helper/pulls, pull requests list page
   * https://github.com/dpy1123/GithubRemark/pull/4, pull request page
   */
  const path = new URL(url).pathname.split("/").filter((x) => x);
  const HTML_TEMPLATE = `<div style="margin:5px 1px;"> <a href="{{url}}" target="_blank" rel="noopener noreferrer" style="display:flex;color:inherit;background:#f5f5f5;text-decoration:none;user-select:none;transition:background 20ms ease-in 0s;cursor:pointer;flex-grow:1;min-width:0;align-items:center;border:1px solid rgba(55,53,47,.16);border-radius:5px;padding:6px;fill:inherit"><div style="display:flex;align-self:start;height:32px;width:32px;margin:3px 12px 3px 4px;position:relative"><div><div style="width:100%;height:100%"><img src="{{avatar}}" referrerpolicy="same-origin" style="display:block;object-fit:cover;border-radius:34px;width:30.192px;height:30.192px;transition:opacity .1s ease-out 0s;box-shadow:rgba(15,15,15,.1) 0 2px 4px"></div></div><div style="position:absolute;bottom:-2px;right:-2px"><div style="width:100%;height:100%"><svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 496 512" style="display:block;object-fit:cover;border-radius:5px;width:14.208px;height:14.208px;transition:opacity .1s ease-out 0s;filter:drop-shadow(white 0 0 1px) drop-shadow(white 0 0 1px) drop-shadow(white 0 0 1px)"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path></svg></div></div></div><div style="display:flex;flex-direction:column;justify-content:center;flex-grow:1;flex-shrink:1;overflow:hidden"><div style="display:flex;align-items:baseline;font-size:14px"><div spellcheck="false" style="white-space:nowrap;color:#37352f;font-weight:500;overflow:hidden;text-overflow:ellipsis">{{title}}</div></div><div style="display:flex;align-items:center;color:rgba(55,53,47,.65);font-size:12px"><div spellcheck="false" style="white-space:nowrap;color:rgba(55,53,47,.65)">{{owner}}</div><span style="margin-left:3px;margin-right:3px">•</span><div style="color:rgba(55,53,47,.65);font-size:12px;white-space:nowrap">{{remark}}</div></div></div><div role="button" tabindex="0" style="user-select:none;transition:background 20ms ease-in 0s;cursor:pointer;opacity:0;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:5px;flex-shrink:0;margin-right:4px;color:rgba(55,53,47,.65)"><svg viewbox="0 0 13 3" class="dots" style="width:14px;height:100%;display:block;fill:inherit;flex-shrink:0;backface-visibility:hidden;color:rgba(55,53,47,.45)"><g><path d="M3,1.5A1.5,1.5,0,1,1,1.5,0,1.5,1.5,0,0,1,3,1.5Z"></path><path d="M8,1.5A1.5,1.5,0,1,1,6.5,0,1.5,1.5,0,0,1,8,1.5Z"></path><path d="M13,1.5A1.5,1.5,0,1,1,11.5,0,1.5,1.5,0,0,1,13,1.5Z"></path></g></svg></div></a></div>`;
  var data = {
    title: "",
    owner: "",
    remark: "",
    avatar: "",
    state_icon: "",
    url: url,
  };
  if (path.length < 2) {
    console.error("Link preview block with unsupported url: ", url);
    return false;
  } else if (path.length == 2) {
    // home page
    const info = await axios
      .get(`https://api.github.com/repos/${path[0]}/${path[1]}`)
      .then((res) => res.data);
    data.title = info.full_name;
    data.avatar = info.owner.avatar_url;
    data.owner = info.owner.login;
    data.remark = "Created: " + info.created_at;
  } else if (path.length == 3) {
    // pulls/issues/actions, pull home page info and add "pulls" or "issues"
    const info = await axios
      .get(`https://api.github.com/repos/${path[0]}/${path[1]}`)
      .then((res) => res.data);
    data.title = info.full_name + "  " + capitalizeFirstLetter(path[2]);
    data.avatar = info.owner.avatar_url;
    data.owner = info.owner.login;
    data.remark = "Created: " + info.created_at;
  } else if (path.length == 4) {
    // pull/issue
    let req_url = "";
    if (path[2] == "issues") {
      // issue detail
      req_url = `https://api.github.com/repos/${path[0]}/${path[1]}/issues/${path[3]}`;
    } else if (path[2] == "pull") {
      req_url = `https://api.github.com/repos/${path[0]}/${path[1]}/pulls/${path[3]}`;
    } else {
      console.error("Link preview block with unsupported url: ", url);
    }
    if (!req_url) return false;
    const info = await axios.get(req_url).then((res) => res.data);
    // add icon, state according to issue/pull state
    var STATE_SVG = {
      pull: {
        opened: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path></svg>`,
        merged: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z"></path></svg>`,
        colsed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path></svg>`,
        draft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0-4.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z"></path></svg>`,
      },
      issue: {
        opened: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`,
        closed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`,
        draft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M14.307 11.655a.75.75 0 0 1 .165 1.048 8.05 8.05 0 0 1-1.769 1.77.75.75 0 0 1-.883-1.214 6.552 6.552 0 0 0 1.44-1.439.75.75 0 0 1 1.047-.165Zm-2.652-9.962a.75.75 0 0 1 1.048-.165 8.05 8.05 0 0 1 1.77 1.769.75.75 0 0 1-1.214.883 6.552 6.552 0 0 0-1.439-1.44.75.75 0 0 1-.165-1.047ZM6.749.097a8.074 8.074 0 0 1 2.502 0 .75.75 0 1 1-.233 1.482 6.558 6.558 0 0 0-2.036 0A.751.751 0 0 1 6.749.097ZM.955 6.125a.75.75 0 0 1 .624.857 6.558 6.558 0 0 0 0 2.036.75.75 0 1 1-1.482.233 8.074 8.074 0 0 1 0-2.502.75.75 0 0 1 .858-.624Zm14.09 0a.75.75 0 0 1 .858.624c.13.829.13 1.673 0 2.502a.75.75 0 1 1-1.482-.233 6.558 6.558 0 0 0 0-2.036.75.75 0 0 1 .624-.857Zm-8.92 8.92a.75.75 0 0 1 .857-.624 6.558 6.558 0 0 0 2.036 0 .75.75 0 1 1 .233 1.482c-.829.13-1.673.13-2.502 0a.75.75 0 0 1-.624-.858Zm-4.432-3.39a.75.75 0 0 1 1.048.165 6.552 6.552 0 0 0 1.439 1.44.751.751 0 0 1-.883 1.212 8.05 8.05 0 0 1-1.77-1.769.75.75 0 0 1 .166-1.048Zm2.652-9.962A.75.75 0 0 1 4.18 2.74a6.556 6.556 0 0 0-1.44 1.44.751.751 0 0 1-1.212-.883 8.05 8.05 0 0 1 1.769-1.77.75.75 0 0 1 1.048.166Z"></path></svg>`, // 草稿
        reopened: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12.5" height="12.5"><path d="M5.029 2.217a6.5 6.5 0 0 1 9.437 5.11.75.75 0 1 0 1.492-.154 8 8 0 0 0-14.315-4.03L.427 1.927A.25.25 0 0 0 0 2.104V5.75A.25.25 0 0 0 .25 6h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.491 6.491 0 0 1 2.314-1.998ZM1.262 8.169a.75.75 0 0 0-1.22.658 8.001 8.001 0 0 0 14.315 4.03l1.216 1.216a.25.25 0 0 0 .427-.177V10.25a.25.25 0 0 0-.25-.25h-3.646a.25.25 0 0 0-.177.427l1.358 1.358a6.501 6.501 0 0 1-11.751-3.11.75.75 0 0 0-.272-.506Z"></path><path d="M9.06 9.06a1.5 1.5 0 1 1-2.12-2.12 1.5 1.5 0 0 1 2.12 2.12Z"></path></svg>`, // 重新打开
      },
    };
    if (path[2] === "pull") {
      if (info.draft) data.state_icon = STATE_SVG.pull.draft;
      else if (info.state === "open") data.state_icon = STATE_SVG.pull.opened;
      else if (info.state === "merged") data.state_icon = STATE_SVG.pull.merged;
      else if (info.state === "closed") data.state_icon = STATE_SVG.pull.closed;
    } else {
      if (info.draft) data.state_icon = STATE_SVG.issue.draft;
      else if (info.state_reason === "reopened")
        data.state_icon = STATE_SVG.issue.reopened;
      else if (info.state === "open") data.state_icon = STATE_SVG.issue.opened;
      else if (info.state === "closed")
        data.state_icon = STATE_SVG.issue.closed;
    }
    if (data.state_icon)
      data.state_icon = `${data.state_icon} #${info.number}<span style="margin-left:3px;margin-right:3px">•</span>`;
    // type: path[2], state: from info.state
    data.title =
      info.title +
      " " +
      (data.state_icon ? data.state_icon : "") +
      capitalizeFirstLetter(info.state); // 图标, 状态
    data.avatar = info.user.avatar_url;
    data.owner = data.state_icon
      ? data.state_icon + info.user.login
      : info.user.login;
    // 添加图标, ID, username
    data.remark = "Created: " + info.created_at;
  } else {
    console.error("Link preview block with unsupported url: ", url);
    return false;
  }
  return HTML_TEMPLATE.replace(/\{\{(.*?)\}\}/g, (match, key) => data[key]);
}

// video
/**
 * 替换文章中的书签占位符。
 * @param {string} content 文章内容。
 * @returns {Promise<string>} 替换后的文章内容。
 */
async function replaceVideo(content) {
  const videoRegex = /<a href="([^"]+)">(video|youtube)<\/a>/g;
  let match;
  let updatedContent = content;
  while ((match = videoRegex.exec(content)) !== null) {
    const url = match[1];
    let newVideo = "";
    try {
      newVideo = await video(url);
    } catch (err) {
      console.error("Error parsing video block: ", err);
    }
    if (newVideo) {
      updatedContent = updatedContent.replace(match[0], newVideo);
    }
  }
  return updatedContent;
}
async function video(url) {
  if (!url) return false;
  var caption = "";
  // fetch the iframe url
  const domain = new URL(url).hostname;
  var vid = false;
  var video_url = "";
  try {
    switch (domain) {
      case "youtu.be":
        vid = new URL(url).pathname.split("/")[1] || false;
      case "m.youtube.com":
      case "www.youtube.com":
        if (!vid) vid = new URL(url).searchParams.get("v") || false;
        if (vid) video_url = `https://www.youtube.com/embed/${vid}`;
        break;
      case "www.bilibili.com":
        vid = new URL(url).pathname.split("/")[2] || false;
        video_url = `//player.bilibili.com/player.html?bvid=${vid}&page=1&autoplay=0`;
        break;
      case "v.qq.com":
        vid = new URL(url).pathname.split("/")[2] || false;
        video_url = `https://v.qq.com/txp/iframe/player.html?vid=${vid}`;
        break;
      default:
        console.warn("Video block with unsupported domain: ", domain);
        video_url = url;
    }
  } catch (err) {
    console.error("Error parsing video block: ", block);
    return false;
  }
  const video_div = `<iframe src="${video_url}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; margin:0; aspect-ratio: 16/9;"> </iframe>`;
  var caption_div = caption
    ? CAPTION_DIV_TEMPLATE.replace("{{caption}}", caption)
    : "";
  return `<div style="width: 100%; margin-top: 4px; margin-bottom: 4px;">${video_div}${caption_div}</div>`;
}

// embed
/**
 * 替换文章中的书签占位符。
 * @param {string} content 文章内容。
 * @returns {Promise<string>} 替换后的文章内容。
 */
async function replaceEmbed(content) {
  const embedRegex = /<a href="([^"]+)">embed<\/a>/g;
  let match;
  let updatedContent = content;
  while ((match = embedRegex.exec(content)) !== null) {
    const url = match[1];
    let newEmbed = "";
    try {
      newEmbed = await embed(url);
    } catch (err) {
      console.error("Error parsing embed block: ", err);
    }
    if (newEmbed) {
      updatedContent = updatedContent.replace(match[0], newEmbed);
    }
  }
  return updatedContent;
}

async function embed(url) {
  const caption = "";
  var iframe = false;
  try {
    switch (new URL(url).hostname) {
      case "twitter.com":
        try {
          // get twitter username and status id using regex from status url like: https://twitter.com/engineers_feed/status/1648224909628428288
          const { username, status_id } = url.match(
            /twitter\.com\/(?<username>\w+)\/status\/(?<status_id>\d+)/
          ).groups;
          // query twitter embed code from twitter
          const data = await axios
            .get(
              `https://publish.twitter.com/oembed?url=https://twitter.com/${username}/status/${status_id}`
            )
            .then((resp) => resp.data);
          iframe = data.html;
        } catch (err) {
          console.error(
            `Error fetching twitter embed code: ${err}, url: ${url}`
          );
          return false;
        }
        break;
      case "www.google.com":
        // check if the url is embed
        if (!url.includes("embed")) {
          console.error("Embed block with unsupported google url: ", url);
          return false;
        }
        iframe = `<iframe src="${url}" style="width: 100%; margin:0; aspect-ratio: 16/9;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        break;
      default:
        console.warn("Embed block with unsupported domain, url: ", url);
        iframe = `<iframe src="${url}" style="width: 100%; margin:0; aspect-ratio: 16/9;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }
  } catch (err) {
    console.error("Error parsing embed block: ", block, err);
    return false;
  }
  if (!iframe) {
    console.error("Embed block without iframe: ", block, err);
    return false;
  }
  var caption_div = caption
    ? CAPTION_DIV_TEMPLATE.replace("{{caption}}", caption)
    : "";
  return `<div style="width: 100%; margin: 0 0 2px;">${iframe}${caption_div}</div>`;
}

module.exports = {
  replaceBookmark: replaceBookmark,
  replaceLinkPreview,
  replaceVideo,
  replaceEmbed,
};
