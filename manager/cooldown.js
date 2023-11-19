//const cooldowns = {
    /**
     * @type {{[id: string]: {[command: string]: number}}} An object mapping snowflakes (user or guild) to an object;
     * the key is the command name, the value is for the duration (timestamp and duration applied to it).
     */
    //user: {},
    /**
     * @type {{[id: string]: {[command: string]: number}}} An object mapping snowflakes (user or guild) to an object;
     * the key is the command name, the value is for the duration (timestamp and duration applied to it).
     */
    //guild: {}
//};

/**
 * @param {'user'|'guild'} type
 * @param {number} timeANDduration If nothing is passed, it will generate 3s of cooldown.
 * @param {string} command (caps insensitive) Interactions starts with 'I_', components starts with 'C_'. 
 * @param {string} id The user's ID or the guild's ID.
 * @returns {boolean}
 *//*
function addCooldown(id, command, timeANDduration=Date.now()+3000, type='user') {
    if ('user' !== type && 'guild' !== type) return false;//!['user', 'guild'].every(a => type !== a)) return false;

    if (!cooldowns[type][id]) { // If the user/guild does not exist.
        cooldowns[type][id] = {
            [command]: timeANDduration || Date.now()+3000
        };

        return true;
    } if (!cooldowns[type][id][command]) { // If the command is not on cooldown on the user/guild's cooldowns.
        cooldowns[type][id][command] = timeANDduration || Date.now()+3000;

        return true;
    } // Beyond this point is when those other people already exists.

    return false;
}

module.exports = {
    /**
     * @param {'user'|'guild'} type
     * @param {number} time
     * @param {string} command Interactions starts with 'I_', components starts with 'C_'. 
     * @param {string} id The user's ID or the guild's ID.
     * @returns {[boolean, number]|[boolean, number, true]} If the number is -1 while the boolean is true, the given id does not exist. If the number is also -2, the command is not registered on the given id's cooldown. Either of these will add a boolean True to the result.
     *//*
    checkCooldown(id, command, time=Date.now(), type='user') {
        return (cooldowns[type][id]) ? (cooldowns[type][id][command]) ? (cooldowns[type][id][command] - time > 0) ? [false, cooldowns[type][id][command] - time] : [true, 0] : [true, -2, true] : [true, -1, true]; //cooldowns[type][id].reduce((acc, cur) => acc + cur, 0) : false;
    },
    addCooldown,
    /**
     * TODO: if this bot would ever get so large, an alternative to using cooldowns object or perhaps this function
     * will be required as theres a potential where it would loop for eg million of user ids a few time, only to get nae nae'd
     * at.
     * 
     * 
     * @param {'user'|'guild'} type
     * @param {number} duration If nothing is passed, it will generate 3s of cooldown.
     * @param {number} time If not passed, it will use the current time upon calling the function.
     * @param {string} command Interactions starts with 'I_', components starts with 'C_'. 
     * @param {string} id The user's ID or the guild's ID.
     * @param {boolean} bypassCheck Bypass checking if the proposed time is already lesser than the current time.
     * @returns {boolean}
     *//*
    updateCooldown(id, command, duration=3000, time=Date.now(), bypassCheck=false, type='user') {
        if ('user' !== type && 'guild' !== type) return false;//!['user', 'guild'].every(a => type !== a)) return false;

        if (!bypassCheck && (duration+time) <= Date.now()) return false;

        let added = addCooldown(id, command, duration+time);

        if (added[0]) return true;

        cooldowns[type][id][command] = time + duration;

        return true;
    }
};*/

/**
 * Initialises a manager of cooldown, it is very cheap way to check cooldown so yk...
 */
module.exports = class CooldownManager {
    constructor() {
        /**
         * @private
         */
        this._list = {
            /**
             * @type {{[id: string]: {[command: string]: number}}} An object mapping snowflakes (user or guild) to an object;
             * the key is the command name, the value is for the duration (timestamp and duration applied to it).
             */
            user: {},
            /**
             * @type {{[id: string]: {[command: string]: number}}} An object mapping snowflakes (user or guild) to an object;
             * the key is the command name, the value is for the duration (timestamp and duration applied to it).
             */
            guild: {},
            /**
             * @type {{[id: string]: {[command: string]: number}}} An object mapping snowflakes (user or guild) to an object;
             * the key is the command name, the value is for the duration (timestamp and duration applied to it).
             */
            channel: {},
        }
    }

    /**
     * @param {'user'|'guild'|'channel'} type
     * @param {number} time
     * @param {string} command Interactions starts with 'I_', components starts with 'C_'. 
     * @param {string} id The user's ID or the guild's ID.
     * @returns {[boolean, number]|[boolean, number, true]} If the number is -1 while the boolean is true, the given id does not exist. If the number is also -2, the command is not registered on the given id's cooldown. Either of these will add a boolean True to the result.
     */
    checkCooldown(id, command, time=Date.now(), type='user') {
        return (this._list[type][id]) ? (this._list[type][id][command]) ? (this._list[type][id][command] - time > 0) ? [false, this._list[type][id][command] - time] : [true, 0] : [true, -2, true] : [true, -1, true];
    }

    /**
     * TODO: if this bot would ever get so large, an alternative to using cooldowns object is required.
     * 
     * @param {'user'|'guild'|'channel'} type
     * @param {number} duration If nothing is passed, it will generate 3s of cooldown.
     * @param {number} time If not passed, it will use the current time upon calling the function.
     * @param {string} command Interactions starts with 'I_', components starts with 'C_'. 
     * @param {string} id The user's ID or the guild's ID.
     * @param {boolean} bypassCheck Bypass checking if the proposed time is already lesser than the current time.
     * @returns {boolean}
     */
    updateCooldown(id, command, duration=3000, time=Date.now(), bypassCheck=false, type='user') {
        if ('user' !== type && 'guild' !== type && 'channel' !== type) return false;//!['user', 'guild'].every(a => type !== a)) return false;

        if (!bypassCheck && (duration+time) <= Date.now()) return false;

        let added = this.addCooldown(id, command, duration+time);

        if (added[0]) return true;

        this._list[type][id][command] = time + duration;

        return true;
    }

    /**
     * @param {'user'|'guild'|'channel'} type
     * @param {number} timeANDduration If nothing is passed, it will generate 3s of cooldown.
     * @param {string} command (caps insensitive) Interactions starts with 'I_', components starts with 'C_'. 
     * @param {string} id The user's ID or the guild's ID.
     * @returns {boolean}
     */
    addCooldown(id, command, timeANDduration=Date.now()+3000, type='user') {
        if ('user' !== type && 'guild' !== type && 'channel' !== type) return false;//!['user', 'guild'].every(a => type !== a)) return false;

        if (!this._list[type][id]) { // If the user/guild does not exist.
            this._list[type][id] = {
                [command]: timeANDduration || Date.now()+3000
            };

            return true;
        } if (!this._list[type][id][command]) { // If the command is not on cooldown on the user/guild's cooldowns.
            this._list[type][id][command] = timeANDduration || Date.now()+3000;

            return true;
        } // Beyond this point is when those other people already exists.

        return false;
    }

}