const { Client, User, Member, Constants } = require("oceanic.js");

const MessageStorage = require("./MessageStorage");
const JSONStorage = require("./JSONStorage");

const { findLastIndex } = require("../utilities");
const { request } = require("undici");
const EncryptHandler = require("../utilities/EncryptHandler")

/**
 * @typedef {Object} DeletedMessage
 * @property {1} type
 * @property {string} id
 * @property {string} content
 * @property {boolean} edited
 * @property {{ id: string, name: string, avatarURL: string }} user
 * @property {{ postedAt: number, deletedAt: number }} dates
 * @property {{ id: string, name: string }} channel
 * @property {{ id: string, name: string }} guild
 * @property {{ id: string, content: string, userName: string }} reference?
 * @property {{ i: string[], n: string[] }} mentions
 * @property {{ id: string, url: string, filename: string, size: number, type?: string }[]} attachments?
 * @property {boolean} reversed
 * 
 * @typedef {Object} EditedMessage
 * @property {2} type
 * @property {string} id
 * @property {{ old: string, new: string}} contents
 * @property {{ id: string, name: string, avatarURL: string }} user
 * @property {{ postedAt: number, editedAt: number }} dates
 * @property {{ id: string, name: string }} guild
 * @property {{ id: string, name: string }} channel
 * @property {boolean} reversed
 * 
 * @typedef {Object} RemovedReaction
 * @property {3} type
 * @property {{ id: string, name: string, animated: boolean }} emoji
 * @property {{ id: string, name: string, avatarURL: string }} user
 * @property {{ id: string }} message
 * @property {{ id: string }} channel
 * @property {{ id: string }} guild
 * @property {number} reactedAt
 * @property {number} removedAt
 */

/**
 * @callback PreCheckFunc
 * @param {{ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../manager/database"), logger: import("../manager/logger"), storage: import("../manager/storage"), client: import("../structures/Wanker"), browser: import("../manager/browser"), cooldown: import("../manager/cooldown"), args: string[] }}
 * @returns {boolean}
 * 
 * @callback onCoolingDownFunc
 * @param {{ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../manager/database"), logger: import("../manager/logger"), storage: import("../manager/storage"), client: import("../structures/Wanker"), browser: import("../manager/browser"), cooldown: import("../manager/cooldown"), args: string[] }}
 * @returns {boolean}
 */

/**
 * @callback HandlerFuncWithoutFlags
 * @param {{ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../manager/database"), logger: import("../manager/logger"), storage: import("../manager/storage"), client: import("../structures/Wanker"), browser: import("../manager/browser"), cooldown: import("../manager/cooldown"), args: string[], captured: string[] }}
 * @returns {boolean|Promise<boolean>|any}
 * 
 * @callback HandlerFuncWithFlags
 * @param {{ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../manager/database"), logger: import("../manager/logger"), storage: import("../manager/storage"), client: import("../structures/Wanker"), browser: import("../manager/browser"), cooldown: import("../manager/cooldown"), args: string[], captured: string[], flags: [string, string[]] }}
 * @returns {boolean|Promise<boolean>|any}
 * 
 * @typedef { { command: string[], trigger: RegExp[], cooldownRespond?: onCoolingDownFunc, cooldown: Partial<{ user: number, channel: number, guild: number }>, id: string, preCheck?: PreCheckFunc, handler: HandlerFuncWithoutFlags } | { command: string[], trigger: RegExp[], cooldownRespond?: onCoolingDownFunc, cooldown: Partial<{ user: number, channel: number, guild: number }>, id: string, preCheck?: PreCheckFunc, parseFlags: true, handler: HandlerFuncWithFlags } } Command
 */

module.exports = class Wanker extends Client {
    /**
     * @param {string} token If given, this will be appended to standard options object
     * @param {import("oceanic.js").ClientOptions} options If passed undefined, a template will be used.
     */
    constructor(token, options={collectionLimits: {messages: 1, members: 5, users: 100}, gateway: {intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT", "GUILD_MESSAGE_REACTIONS"]}}) {
        if (token && !options.auth) {
            options.auth = token;
        }

        super(options);

        this.connectedAt = 0;

        this.constants = {
            maintainers: ["635231533137133589", "339050872736579589"],
        };

        this.cache = {
            /**
             * @type {{ id: string, content: string, user: { id: string, name: string, avatarURL: string}, dates: { postedAt: number}, channel: { id: string, name: string }, guild: { id: string, name: string }, reference?: { id: string, content: string, userName: string }, attachments?: {id: string, url: string, filename: string, size: number}[], mentions: {i: string[], n: string[]}}[]}
             */
            messages: [],
            /**
             * @type {DeletedMessage[]}
             */
            deleted_msg: [],
            /**
             * @type {EditedMessage[]}
             */
            edited_msg: [],
            /**
             * @type {{ emoji: { id: string, name: string, animated: boolean }, user: { id: string, name: string, avatarURL: string }, message: {id: string}, channel: {id: string}, guild: {id: string}, reactedAt: number }[]}
             */
            reactions: [],
            /**
             * @type {RemovedReaction[]}
             */
            removed_reaction: [],
            /**
             * Limits of up to three
             * @type {[string, string, DeletedMessage|EditedMessage|RemovedReaction]}
             */
            sniped: []
        }

        /**
         * @type {Command[]}
         */
        this.commands = [];

        this.debug = false;

        /**
         * NOTE this is in terms of JSONStorage.
         * Also, removed reactions are deliberately not included, for they're so fucking useless.
         * @type {{ msg: JSONStorage<{deletedMsg: DeletedMessage[], editedMsg: EditedMessage[]}> }}
         */
        this.jsons = {};

        this.temporary = {
            /**
             * @type {{[authorID: string]: [number[]]}}
             */
            uses: {},
            /**
             * @type {{[authorID: string]: [number]}}
             */
            blacks: {},
        }
    }

    /**
     * @param {string|Member} user ID (snowflake) / Member or User
     */
    isMaintainer(user) {
        // if (user instanceof Member) user = user.user; idk if good cos what if user is mutable? if i do this, it will mean rip for member object that gets passed in.

        if (typeof(user) === "string") return this.constants.maintainers.includes(user);
        if (user instanceof User) return this.constants.maintainers.includes(user.id);
        if (user instanceof Member) return this.constants.maintainers.includes(user.user.id); // yep
        else return false;
    }

    /**
     * @param {boolean} reverse If set to anything other than boolean, will be used as criteria (EXCEPT IF IT'S A BOOLEAN DUH).
     * @param {string|string[]|[boolean, ...string[]]|boolean} criteria Starts from the end, finds it way until the last element that meets it. If given string, will be used as channel ID. If given array of string, will be used as the list of channel ids that's accepted. If given array of string and boolean only at the start, the boolean will be used to determine whether if the list is meant to be list of channel ids accepted (true), or excluded (false). If given boolean, will be used at the end of the array and loops backward, until the message content isn't the same.
     * @returns {DeletedMessage|DeletedMessage[]}
     */
    snipe(guildId, reverse=false, sniped, isReversed=true, criteria=null) {
        if (reverse === true) {
            this.jsons.msg.value.deletedMsg.push({...sniped, reversed: isReversed});
            return this.jsons.msg.saveQueue();
        } else if (reverse !== false) {
            criteria = reverse;
        }

        if (this.jsons.msg.value.deletedMsg.length) {
            /**
             * @param {DeletedMessage} msg
             */
            const messageWrap = (msg) => { return {
                id: msg.id,
                content: msg.content,
                user: msg.user,
                dates: msg.dates,
                channel: msg.channel,
                guild: msg.guild,
                reference: msg.reference || {
                    id: null,
                    content: null,
                    userName: null
                },
                mentions: msg.mentions || {
                    i: [], n: []
                },
                attachments: msg.attachments || [],
                reversed: msg.reversed, 
                edited: msg.edited,
                type: 1
            }};

            /**
             * @type {DeletedMessage}
             */
            let msg;

            console.log(criteria);

            if (criteria) {
                if (typeof criteria === "string") {
                    let index = findLastIndex(this.jsons.msg.value.deletedMsg, (v => v.channel.id === criteria && v.guild.id === guildId));

                    if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };

                    msg = this.jsons.msg.value.deletedMsg.splice(index, 1)[0];
                } else if (typeof criteria === "boolean") {
                    let reversed = this.jsons.msg.value.deletedMsg.slice().reverse();

                    let orig = { content: EncryptHandler.decrypt(reversed[0].content).trim() };//, uId: reversed[0].user.id };

                    let list = [reversed[0]];

                    for (let i = 1; i < reversed.length; i++) {
                        let content = EncryptHandler.decrypt(reversed[i].content).trim();

                        if (orig.content === content
                            && reversed[0].user.id === reversed[i].user.id
                            && reversed[0].channel.id === reversed[i].channel.id
                            && reversed[0].guild.id === guildId
                            && !reversed[0].attachments.length) list.push(reversed[i]);
                        else break;
                    }

                    this.jsons.msg.value.deletedMsg.splice(this.jsons.msg.value.deletedMsg.length - list.length, list.length)[0];

                    return list.map(v => messageWrap(v));
                } else if (Array.isArray(criteria)) {
                    if (typeof criteria[0] === "boolean") {
                        let index = findLastIndex(this.jsons.msg.value.deletedMsg, (v => v.guild.id === guildId && (criteria[0] ? criteria.includes(v.channel.id) : !criteria.includes(v.channel.id))));
    
                        if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };
    
                        msg = this.jsons.msg.value.deletedMsg.splice(index, 1)[0];
                    } else if (criteria[0] === 2) {
                        // not like there's any id that's exactly 2 type number anyways
                        let index = findLastIndex(this.jsons.msg.value.deletedMsg, (v => v.guild.id === guildId && criteria.includes(v.user.id)));
    
                        if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };
    
                        msg = this.jsons.msg.value.deletedMsg.splice(index, 1)[0];
                    } else  { // Assumes all else is string.
                        let index = findLastIndex(this.jsons.msg.value.deletedMsg, (v => v.guild.id === guildId && criteria.includes(v.channel.id)));
    
                        if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };
    
                        msg = this.jsons.msg.value.deletedMsg.splice(index, 1)[0];
                    }
                }

            } else {
                let index = findLastIndex(this.jsons.msg.value.deletedMsg, v => v.guild.id === guildId);
    
                if (index === -1) return null;
    
                msg = this.jsons.msg.value.deletedMsg.splice(index, 1)[0];
            }

            this.jsons.msg.saveQueue();

            return messageWrap(msg);
        } return null;
    }

    /**
     * @param {boolean} reverse If set to anything other than boolean, will be used as criteria.
     * @param {string|string[]|[boolean, ...string[]]} criteria Starts from the end, finds it way until the last element that meets it. If given string, will be used as channel ID. If given array of string, will be used as the list of channel ids that's accepted. If given array of string and boolean only at the start, the boolean will be used to determine whether if the list is meant to be list of channel ids accepted (true), or excluded (false).
     * @returns {EditedMessage|EditedMessage[]}
     */
    esnipe(guildId, reverse=false, sniped, isReversed=true, criteria=null) {
        if (reverse === true) {
            this.jsons.msg.value.editedMsg.push({...sniped, reversed: isReversed});
            return this.jsons.msg.saveQueue();
        } else if (reverse !== false) {
            criteria = reverse;
        }

        if (this.jsons.msg.value.editedMsg.length) {
            /**
             * @param {EditedMessage} msg
             */
            const messageWrap = (msg) => { return {
                id: msg.id,
                contents: {
                    old: msg.contents.old,
                    new: msg.contents.new
                },
                user: msg.user,
                dates: {
                    postedAt: new Date(msg.dates.postedAt),
                    editedAt: new Date(msg.dates.editedAt),
                },
                channel: msg.channel,
                guild: msg.guild,
                reversed: msg.reversed,
                type: 2
            }};


            /**
             * @type {DeletedMessage}
             */
            let msg;

            if (criteria) {
                if (typeof criteria === "string") {
                    let index = findLastIndex(this.jsons.msg.value.editedMsg, (v => v.guild.id === guildId && v.channel.id === criteria));

                    if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };

                    msg = this.jsons.msg.value.editedMsg.splice(index, 1)[0];
                } else if (Array.isArray(criteria)) {
                    if (typeof criteria[0] === "boolean") {
                        let index = findLastIndex(this.jsons.msg.value.editedMsg, (v => v.guild.id === guildId && (criteria[0] ? criteria.includes(v.channel.id) : !criteria.includes(v.channel.id))));
    
                        if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };
    
                        msg = this.jsons.msg.value.editedMsg.splice(index, 1)[0];
                    } else { // Assumes all else is string.
                        let index = findLastIndex(this.jsons.msg.value.editedMsg, (v => v.guild.id === guildId && criteria.includes(v.channel.id)));
    
                        if (index === -1) return { success: false, reason: "CRITERIA_FAILED" };
    
                        msg = this.jsons.msg.value.editedMsg.splice(index, 1)[0];
                    }
                }
                
            } else {
                let index = findLastIndex(this.jsons.msg.value.editedMsg, v => v.guild.id === guildId);
    
                if (index === -1) return null;
    
                msg = this.jsons.msg.value.editedMsg.splice(index, 1)[0];
            }

            this.jsons.msg.saveQueue();

            return messageWrap(msg);
        } return null;
    }

    /**
     * @param {{ emoji: { id: string, name: string, animated: boolean }, user: { id: string, name: string, avatarURL: string }, message: {id: string}, channel: {id: string}, reactedAt: Date, removedAt: Date, type: 3 }} sniped
     * @returns {RemovedReaction}
     */
    rsnipe(guildId, reverse=false, sniped) {
        if (reverse) {
            return this.cache.removed_reaction.push(sniped);
        }

        if (this.cache.removed_reaction.length) {
            const index = findLastIndex(this.cache.removed_reaction, v => v.guild.id === guildId);

            if (index === -1) return null;

            let reaction = this.cache.removed_reaction.splice(index, 1)[0];

            return {...reaction, reactedAt: new Date(reaction.reactedAt), removedAt: new Date(reaction.removedAt), type: 3 };

        } return null;
    }

    /**
     * For storage/utilities (just useless ik)
     * @template T
     * @param {string} channelID
     * @param {string} messageID
     * @param {T} schema
     */
    async loadMessage(channelID, messageID, schema) {
        return this.rest.channels.getMessage(channelID, messageID)
            .then((msg) => new MessageStorage(schema, this, msg));
    }

    /**
     * For JSON storage/utilities (just useless ik)
     * @template T
     * @param {T} schema
     */
    async loadJSON(path, schema, index=-1) {
        let x = new JSONStorage(schema, path);
        this.jsons[index] = x;
        //if (index === -1) this.jsons.push(x);
        //else this.jsons[index] = x;

        return x;
    }

    refreshCommands = () => {
        // .
    }
}