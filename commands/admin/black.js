const ms = require("ms");
const { regexes } = require("../../utilities");

module.exports = {
    command: ["black"],
    /**
     * @type {function ({ msg: import("oceanic.js").Message<import("oceanic.js").AnyTextableGuildChannel>, db: import("../../manager/database"), logger: import("../../manager/logger"), storage: import("../../manager/storage"), client: import("../../structures/Wanker"), args: string[] }): Promise<boolean>|boolean}
     */
    handler: async ({ client, msg, db, args }) => {
        if (!client.isMaintainer(msg.author.id)) return false;

        let entityId = args[1];
        let duration = args[2];
        let type = args[3];

        if (entityId.match(regexes.snowflake)?.length) {
            if (!(type === "0" || type === "1" || type === undefined)) return client.rest.channels.createReaction(msg.channelID, msg.id, "🥸");

            const dates = [Date.now(), null];

            if (duration && duration.length > 0) dates[1] = (dates[0] + ms(duration));

            return db.addblacklistID(entityId, type === undefined ? 0 : parseInt(type), msg.author.id, dates);
        } else return client.rest.channels.createReaction(msg.channelID, msg.id, "❄");
    }
}