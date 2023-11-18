module.exports = class UserSettings {
    /**
     * @param {Object} data
     * @param {string} data.id
     * @param {number?} data.flags
     * @param {number?} data.lb_view
     * @param {number?} data.lb_default
     */
    constructor(data={}) {
        if (!data.id) throw Error("ID not defined");

        this.id = data.id;
        this.flags = data.flags;
        this.lb_view = data.lb_view;
        this.lb_default = data.lb_default;
    }
}