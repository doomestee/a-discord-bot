// This is simply for Backblaze/S3 stuff

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Note that with the given application key, it's been authorised to only write files for now.
 */
module.exports = class StorageManager {
    constructor() {
        this.client = new S3Client({
            endpoint: "https://s3.us-east-005.backblazeb2.com",
            region: "us-east-005",
        });
    }

    /**
     * file can be any, buffer or string or w/e.
     * @param {string} path starting from xyz.com/ (note it includes the /!!! Don't put / at the start)
     * @param {string|Buffer|Array} file CAN'T BE AN OBJECT! Use JSON.stringify
     */
    writeFile(path, file) {
        if (path.startsWith("/")) path = path.slice(1);

        let obj = {};

        if (path.endsWith(".json")) obj["ContentType"] = "application/json";

        return this.client.send(new PutObjectCommand({
            Bucket: "sniperoo",
            Key: path,
            Body: file,
            ...obj
        }))
    }
}