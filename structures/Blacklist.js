module.exports = class Blacklist {
    /**
     * @param {Object} data
     * @param {number} data.id Autoincrements
     * @param {number} data.type 0 for User, 1 for Server.
     * @param {string} data.userid ID of the blacklisted.
     * @param {string} data.source ID of the person who blacklisted the ID.
     * @param {Date} data.start When it started
     * @param {Date?} data.end When it ended/will end, or if NaN/null then indefinite.
     */
    constructor(data={}) {
        if (!data.user) throw Error("UserId not defined");

        this.id = data.id;
        this.type = data.type;
        this.user = data.user;
        this.source = data.source;
        this.start = data.start;
        this.end = data.end || null;
    }
}