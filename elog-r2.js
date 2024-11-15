const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types"); // 用于自动推断文件类型

const formattedPrefix = (prefix) => {
  if (!prefix) return '';
  let _prefix = prefix;
  if (_prefix.startsWith('/')) {
    _prefix = _prefix.slice(1);
  }
  if (!_prefix.endsWith('/')) {
    _prefix = `${_prefix}/`;
  }
  return _prefix;
};

class ImageUploader {
  constructor(config) {
    this.config = config.r2;
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
    this.s3Client = new S3Client({
      region: this.config.region || "auto",
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async hasImage(fileName) {
    try {
      await this.s3Client.send(new HeadObjectCommand({ 
        Bucket: this.config.bucket, 
        Key: this.config.prefixKey + fileName 
      }));
      return `https://${this.config.host}/${this.config.prefixKey + fileName}`;
    } catch (err) {
      if (err.name === "NotFound") {
        return undefined;
      }
      console.error("Error checking image existence:", err.message);
      throw err; // 抛出错误，便于上层处理
    }
  }

  async uploadImg(imgBuffer, fileName) {
    try {
      // 自动推断文件的 ContentType
      const contentType = mime.lookup(fileName) || "application/octet-stream";

      const params = {
        Bucket: this.config.bucket,
        Key: this.config.prefixKey + fileName,
        ContentType: contentType, // 设置 ContentType
        Body: imgBuffer,
      };

      await this.s3Client.send(new PutObjectCommand(params));
      return `https://${this.config.host}/${this.config.prefixKey + fileName}`;
    } catch (err) {
      console.error("Error uploading image:", err.message);
      throw err; // 抛出错误，便于上层处理
    }
  }
}

module.exports = ImageUploader;
