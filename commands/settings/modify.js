module.exports = {
    command: ["enable", "disable"],
    /**
     * @type {function ({ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../../manager/database"), logger: import("../../manager/logger"), storage: import("../../manager/storage"), client: import("../../structures/Wanker"), args: string[] }): Promise<boolean>|boolean}
     */
    handler: async ({ client, msg, db, args }) => {
        if (!(msg.member.permissions.has("MANAGE_MESSAGES") || client.isMaintainer(msg.author.id))) return false;

        if (args[1] === undefined) args[1] = "channel";

        switch (args[1]) {
            case "guild":
                db.updateGuildSettings(msg.guildID, { snipeMode: args[0] === "disable" ? 0 : args[2] === "all" ? 3 : 1 });
                msg.createReaction("👍");
                return true;
            case "channel":
                db.updateGuildChannelSettings(msg.guildID, msg.channelID, { snipeMode: args[0] === "disable" ? 0 : 1 });//args[2] === "track" ? 3 : 1 });
                msg.createReaction("👍");
                return true;
        }
    }
}