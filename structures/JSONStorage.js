const { promises: { readFile, writeFile} } = require("fs");

/**
 * @template [T=object]
 */
module.exports = class JSONStorage {
    /**
     * @param {T} T Only object, anything else will error. (Arrays works)
     * @param {string} path Path resolve before giving pls. Do include the .json at the end!
     */
    constructor(T, path, writeDelayMs=10000, writeThreshold=10) {
        /**
         * @type {T} This can be used if trying to modify an object stored without clearing it. Use .save() afterward to keep progress.
         */
        this.value = null;
        this.initialised = Date.now();
        this.path = path;

        this.writeDelayMs = writeDelayMs;
        this.writeThreshold = writeThreshold;
        this.writeTimer = null;
        this.writeCount = 0;

        if (typeof T === "object") this.type = (T instanceof Array) ? 1 : 0;
        else throw Error("Type passed non-object");
        //else if (typeof T === "boolean") this.type = 3;
        //else if (typeof T === "number") this.type = 2;
        //else if (typeof T === "string") this.type = 1;

        this._load(path, T);
    }

    async _load(path, template) {
        // Yes, I took some from asking chatgpt here. Bonus point if you can guess which line is from chatgpt and which isn't.

        // Read existing data from file
        let existingData = null;
        try {
            const fileData = await readFile(this.path);
            existingData = JSON.parse(fileData.toString());
        } catch (error) {
            // If file doesn't exist or is empty, existingData will be an empty array
            existingData = this.type === 0 ? {} : [];

            if (template && this.type === 0) {
                existingData = template;
            }
        }

        this.value = existingData;
    }

    async save() {
        //let result = String(this.value);

        //if (this.type === 0) result = JSON.stringify(this.value, undefined, 2);

        //if (this.tag) result = this.tag + result;
        const json = JSON.stringify(this.value, null, 2);
        await writeFile(this.path, json);

        return 1;
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

    // HAIL CHATGPTTTT
    saveQueue() {
        this.writeCount++;

        // Cancel any existing timer and start a new one
        clearTimeout(this.writeTimer);

        // If write threshold is reached, write to file immediately
        if (this.writeCount >= this.writeThreshold) {
            this._writeQueueToFile();
        } else this.writeTimer = setTimeout(() => {
            this._writeQueueToFile();
        }, this.writeDelayMs);
    }

    async _writeQueueToFile() {
        // Write updated data back to file
        const json = JSON.stringify(this.value, null, 2);
        await writeFile(this.path, json);
    
        // Reset queue and count
        this.writeCount = 0;
    }
}