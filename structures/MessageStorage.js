/**
 * @template [T=object]
 */
module.exports = class MessageStorage {
    /**
     * @param {T} T
     * @param {import("./Wanker")} client
     * @param {import("oceanic.js").Message<import("oceanic.js").TextChannel>} message
     * @param {string} tag
     */
    constructor(T, client, message, tag=null) {
        this.client = client;
        /**
         * @type {T} This can be used if trying to modify an object stored without clearing it. Use .save() afterward to keep progress.
         */
        this.value = null;
        this.id = { channel: "", message: ""};
        this.tag = tag;

        if (typeof T === "object") this.type = 0;
        else if (typeof T === "boolean") this.type = 3;
        else if (typeof T === "number") this.type = 2;
        else if (typeof T === "string") this.type = 1;

        this._load(message);
    }

    /**
     * @param {import("oceanic.js").Message<import("oceanic.js").TextChannel>} message
     * @returns {T}
     */
    _load(message) {
        let { content } = message;

        if (this.tag) content = content.slice(this.tag.length);

        if (this.type === 0) this.value = JSON.parse(content);
        else if (this.type === 1) this.value = content;
        else if (this.type === 2) this.value = Number(content);
        else if (this.type === 3) this.value = Boolean(content);

        this.id = { channel: message.channelID, message: message.id };
    }

    async save() {
        let result = String(this.value);

        if (this.type === 0) result = JSON.stringify(this.value);

        if (this.tag) result = this.tag + result;

        return this.client.rest.channels.editMessage(this.id.channel, this.id.message, {
            content: result
        });
    }

    /**
     * @param {T} val If T is object, and a partial object is given, it will only replace the properties of the stored value so other properties are retained.
     * @param {boolean} save 
     */
    async modifyValues(val, save=false) {
        if (this.type === 0) {
            for (let [key, value] of Object.entries(val)) {
                this.value[key] = value;
            }
        } else this.value = val;

        if (save) { return this.save(); }
        else return true;
    }
}