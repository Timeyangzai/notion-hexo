const { url } = require('hexo/dist/hexo/default_config')

module.exports = {
  write: {
    platform: 'notion',
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID,
      filter: {property: 'status', select: {equals: '已发布'}},
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      catalog: {
        enable: true,
        property: "day"
      },
    },
  },

  deploy: {
    platform: 'local',
    local: {
      outputDir: './source/_posts',
      filename: 'title',
      format: 'markdown',
    },
  },
  image: {
    enable: true,
    platform: 'r2',
    plugin: './elog-r2.js',
    r2: {
      accessKeyId: process.env.R2_ACCESSKEYID,
      secretAccessKey: process.env.R2_SECRET_ACCESSKEY,
      bucket: process.env.R2_BUCKET,
      endpoint: process.env.R2_ENDPOINT,
      host: process.env.R2_HOST,
      prefixKey: 'notion'
    }
  }
}
