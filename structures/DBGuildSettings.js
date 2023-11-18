module.exports = class GuildSettings {
    /**
     * @param {Object} data
     * @param {string} data.id
     * @param {number} data.flags
     * @param {number} data.snipeMode 0 for disabled, 1 for enabled (send, track), 2 for enabled (track), 3 for enabled (all send, all track)
     */
    constructor(data={}) {
        if (!data.id) throw Error("ID not defined");

        this.id = data.id;
        this.flags = data.flags;
        /**
         * 0 for disabled, 1 for enabled (send, track), 2 for enabled (track), 3 for enabled (all send, all track)
         */
        this.snipeMode = data.snipeMode;
    }
}