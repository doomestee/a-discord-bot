module.exports = class Blacklist {
    /**
     * @param {Object} data
     * @param {number} data.id Autoincrements
     * @param {number} data.type 0 for User, 1 for Server.
     * @param {string} data.entityid ID of the blacklisted.
     * @param {string} data.source ID of the person who blacklisted the ID.
     * @param {number} data.start When it started
     * @param {number?} data.end When it ended/will end, or if NaN/null then indefinite.
     */
    constructor(data={}) {
        if (!data.entityid) throw Error("Entity ID not defined");

        this.id = data.id;
        this.type = data.type;
        this.entityid = data.entityid;
        this.source = data.source;
        this.start = data.start;
        this.end = data.end || null;
    }
}