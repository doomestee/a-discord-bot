const { getUserLevelByExp } = require("../utilities");

const Blacklist = require("../structures/Blacklist");
const UserSettings = require("../structures/DBUserSettings");
const GuildSettings = require("../structures/DBGuildSettings");
const GuildChannelSettings = require("../structures/DBGuildChannelSettings");
const Database = require("better-sqlite3");

const { existsSync, readFileSync } = require("fs");
const path = require("path");

const repeatStr = (str="?", count) => new Array(Number.isInteger(str) ? str : count).fill(Number.isInteger(str) ? "?" : str).join(", ")

/**
 * Currently supports Better-SQLite3
 */
module.exports = class DatabaseManager {
    /**
     * @param {string} path MUST BE GIVEN, it's the path to the sqlite database.
     * @param {import("./logger")?} logger MUST BE BOUND TO before using any other methods
     * @param {import("../structures/Wanker")?} discord MUST BE BOUND TO before using any other methods
     */
    constructor(path, logger, discord, setup=false) {
        this.initialised = false;

        this.cache = {
            /**
             * 0th is the ID, 1st is the type (0 for User, 1 for Server), 2nd is if they're blacklisted.
             * @type {[number, number, boolean]}
             */
            blacklist: [],
            /**
             * Key is the ID, value is the settings.
             * @type {{ [guildId: string]: GuildSettings }}
             */
            guildsettings: {},
            /**
             * Key is the ID, value is the settings.
             * @type {{ [channelId: string]: GuildChannelSettings }}
             */
            channelsettings: {},
        }

        /**
         * @type {import("./logger")}
         */
        this._logger = logger;
        /**
         * @type {import("../structures/Wanker")}
         */
        this._discord = discord;

        this.createdAt = Date.now();

        if (!existsSync(path)) setup = true;
        this.db = new Database(path);

        if (setup) this.setup();

        this.prepared = {
            blacklist: {
                insert: this.db.prepare("INSERT INTO blacklist (entityid, type, source, start, end) VALUES (" + repeatStr(5) + ")"),
                selectByEntityId: this.db.prepare("SELECT * FROM blacklist WHERE entityid = ?")
            },
            guild: {
                insert: this.db.prepare("INSERT INTO guildSettings (id, snipeMode, flags) VALUES (" + repeatStr(3) + ")"),
                selectById: this.db.prepare("SELECT * FROM guildSettings WHERE id = ?"),
                updateFlags: this.db.prepare("UPDATE guildSettings SET flags = ? WHERE id = ?"),
                updateSnipe: this.db.prepare("UPDATE guildSettings SET snipeMode = ? WHERE id = ?")
            },
            channel: {
                insert: this.db.prepare("INSERT INTO guildChannelSettings (id, guildId, snipeMode) VALUES (" + repeatStr(3) + ")"),
                selectById: this.db.prepare("SELECT * FROM guildChannelSettings WHERE id = ?"),
                updateSnipe: this.db.prepare("UPDATE guildChannelSettings SET snipeMode = ? WHERE id = ?")
            }
        }
    }
    
    setup() {
        this.db.exec(readFileSync(path.resolve("./setup.sql"), "utf8"));
    }

    initialise() {
        // ...
        this.initialised = true;
    }

    /**
     * @param {string} entityid
     * @param {string} source
     * @param {[Date|null, Date|null]} dates
     * @param {0|1} type Type 0 for user, 1 for guild.
     */
    addblacklistID(entityid, type=0, source, dates=[new Date()]) {
        const toSpread = [dates.length ? dates[0] : new Date()];

        if (dates.length > 1) toSpread[1] = dates[1];

        return this.prepared.blacklist.insert.run(entityid, type, source, ...toSpread);
    }

    /**
     * Returns based on EXACT values.
     * @param {string|Pick<Blacklist, "entityid">} identifier If string, it will return the list of all blacklist records for the user with that ID, not the source/mod.
     * @returns {Promise<[0|1, Blacklist[] | null]|[-1, null]>} Note that for the first index; -1 means error has occurred, 0 for not blacklisted, 1 for blacklisted.
     */
    isBlacklisted(identifier) {
        let obj = {};

        if (typeof(identifier) == "string") obj['entityid'] = identifier;
        else {
            obj = identifier;
        }

        const select = this.prepared.blacklist.selectByEntityId.all(obj.entityid);//await this.db("blacklist").select("*").where(obj).catch((err) => {this._logger.error(err); return false;});

        if (select === false) {
            return [-1, null];
        }

        if (select.length) {
            /**
             * @type {[0|1, Blacklist[]]}
             */
            const result = [0, []];

            for (let i = 0; i < select.length; i++) {
                result[1].push(new Blacklist(select[i]));

                //if (result[0] === 1 && result[1][i].end > result[1][i].end) result[0] = 0;
                if (result[0] === 0 && (result[1][i].end === null || new Date() < result[1][i].end)) result[0] = 1;//if (result[0] === 1 && result[1][i].end !== null && new Date() > result[1][i].end) result[0] = 0;
            }

            return result;
        } else return [0, null];
    }

    /**
     * @param {string} guildId
     * @param {string} channelId
     */
    refreshGuildSettings(guildId, channelId) {
        // CHECKS IF IT'S IN THE CACHE FIRST.
        // TODO: cache expiration

        if (this.cache.guildsettings[guildId] == undefined) {
            const guildSet = this.prepared.guild.selectById.get(guildId);

            if (guildSet === undefined) {
                this.prepared.guild.insert.run(guildId, 0, 0);

                this.cache.guildsettings[guildId] = new GuildSettings({ id: guildId, flags: 0, snipeMode: 0 });
            } else this.cache.guildsettings[guildId] = new GuildSettings(guildSet);
        }

        if (channelId && this.cache.channelsettings[channelId] == undefined) {
            const channelSet = this.prepared.channel.selectById.get(channelId);

            if (channelSet === undefined) {
                this.prepared.channel.insert.run(channelId, guildId, 0);

                this.cache.channelsettings[channelId] = new GuildChannelSettings({ guildId, id: channelId, snipeMode: 0 });
            } else this.cache.channelsettings[channelId] = new GuildChannelSettings(channelSet);
        }
    }

    /**
     * 
     * @returns {0|1|2} 0 for no, 1 for tracking, 2 for sending
     */
    isChannelSnipable(channelId, guildId) {
        this.refreshGuildSettings(guildId, channelId);

        /* SnipeMode:
            - 0 for disabled
            - 1 for enabled - can send sniped content, tracks contents
            - 2 for enabled - can't send sniped content, tracks contents
            - 3 for enabled (GUILD ONLY) - can send sniped content, tracks ALL contents (irrespective of channel overrides)
        */

        const gSnipe = this.cache.guildsettings[guildId].snipeMode;
        const cSnipe = this.cache.channelsettings[channelId].snipeMode;

        // Doing it in order is important; global disable > global enable > channel disable > blah
        // rip readability

        if (gSnipe === 0) return 0;
        if (gSnipe === 3) return 2;
        if (cSnipe === 0) return 0;
        if ((cSnipe === 1 || cSnipe === 2) && gSnipe === 1) return 2;
        if ((cSnipe === 1 || cSnipe === 2) && (gSnipe === 2 || cSnipe === 2)) return 1;
        this._logger.error(`Uh oh, brain fart; gSnipe - ${gSnipe}, cSnipe - ${cSnipe}`);
        return 0;
    }

    /**
     * @param {string} guildId
     * @param {Omit<GuildSettings, "id">} obj
     */
    updateGuildSettings(guildId, obj) {
        this.refreshGuildSettings(guildId);

        if (obj.snipeMode !== undefined) { this.prepared.guild.updateSnipe.run(obj.snipeMode, guildId); this.cache.guildsettings[guildId].snipeMode = obj.snipeMode };
        if (obj.flags !== undefined) { this.prepared.guild.updateFlags.run(obj.flags, guildId); this.cache.guildsettings[guildId].flags = obj.flags };
    }

    /**
     * @param {string} guildId
     * @param {string} channelId
     * @param {Omit<GuildChannelSettings, "id"|"guildId">} obj
     */
    updateGuildChannelSettings(guildId, channelId, obj) {
        this.refreshGuildSettings(guildId, channelId);

        if (obj.snipeMode !== undefined) { this.prepared.channel.updateSnipe.run(obj.snipeMode, channelId); this.cache.channelsettings[channelId].snipeMode = obj.snipeMode };
    }

    /**
     * @param {string} discordID
     * @returns {Promise<UserSettings>} Null if no existy
     */
    async getUserSettings(discordID="") {
        //return this.db("user_settings").where({ id: discordID }).then(v => v.length ? new UserSettings(v[0]) : null);
    }

    /**
     * @param {UserSettings} obj
     */
    async createUserSettings(obj) {
        //return this.db("user_settings").insert(obj);
    }

    /**
     * @param {string} discordID
     * @param {UserSettings} objToUpdate
     */
    async updateUserSettings(discordID="", objToUpdate) {
        //return this.db("user_settings").where({ id: discordID }).update(objToUpdate)
            //.onConflict().merge().then(v => v !== 0);
    }
}