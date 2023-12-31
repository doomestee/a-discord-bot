const { TextableChannelTypes } = require("oceanic.js");
const { regexes } = require("../../utilities");

/**
 * @type {import("../../structures/Wanker").Command}
 */
module.exports = {
    command: ["enable", "disable"], parseFlags: true,
    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithFlags}
     */
    handler: async ({ client, msg, db, args, flags }) => {
        if (!(msg.member.permissions.has("MANAGE_MESSAGES") || client.isMaintainer(msg.author.id))) return false;

        if (args[1] === undefined) args[1] = "channel";

        switch (args[1]) {
            case "guild": case "server":
                db.updateGuildSettings(msg.guildID, { snipeMode: args[0] === "disable" ? 0 : args[2] === "all" ? 3 : 1 });
                msg.createReaction("👍");
                return true;
            case "channel":
                let id = msg.channelID;

                if (args[2]) {
                    id = args[2].match(regexes.snowflake);

                    if (id === null || id.length === 0) { msg.channel.createMessage({ content: "The second parameter (after `" + args[0] + " channel`) is not a valid channel mention/id. (Please don't use the name)", messageReference: { failIfNotExists: true, messageID: msg.id } }); return false; }

                    id = id[0];

                    if (!msg.guild.channels.has(id)) { msg.channel.createMessage({ content: "The channel given isn't of this server.", messageReference: { failIfNotExists: true, messageID: msg.id } }); return false; }
                }

                db.updateGuildChannelSettings(msg.guildID, id, { snipeMode: args[0] === "disable" ? 0 : flags.length && flags.some(v => v[0] === "t") ? 2 : 1 });//args[2] === "track" ? 3 : 1 });
                msg.createReaction("👍");
                return true;
            case "channels":
                let ids = msg.guild.channels.filter(v => TextableChannelTypes.some(g => g === v.type) ).map(v => v.id);

                if (args.length > 3) {
                    ids = [];

                    for (let arg of args.slice(2)) {
                        let snow = arg.match(regexes.snowflake);

                        if (snow === null || snow.length === 0) { msg.channel.createMessage({ content: "One of the channel given (" + arg + ") is not a valid channel mention/id. (Please don't use the name)", messageReference: { failIfNotExists: true, messageID: msg.id } }); return false; }

                        if (!msg.guild.channels.has(snow[0])) { msg.channel.createMessage({ content: "One of the channel given (" + snow[0] + ") isn't of this server.", messageReference: { failIfNotExists: true, messageID: msg.id } }); return false; }

                        ids.push(snow[0]);
                    }
                }

                db.updateGuildChannelsSettings(msg.guildID, ids, { snipeMode: args[0] === "disable" ? 0 : flags.length && flags.some(v => v[0] === "t") ? 2 : 1 });
                msg.createReaction("👍");
                return true;
        }
    }
}