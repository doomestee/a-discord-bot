module.exports = class GuildChannelSettings {
    /**
     * @param {Object} data
     * @param {string} data.id
     * @param {string} data.guildId
     * @param {number} data.snipeMode 0 for disabled, 1 for enabled (send, track), 2 for enabled (track)
     */
    constructor(data={}) {
        if (!data.id) throw Error("ID not defined");

        this.id = data.id;
        this.guildId = data.guildId;
        /**
         * 0 for disabled, 1 for enabled (send, track), 2 for enabled (track)
         */
        this.snipeMode = data.snipeMode;
    }
}