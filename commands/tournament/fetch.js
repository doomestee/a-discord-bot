const { TextableChannelTypes } = require("oceanic.js");
const { regexes } = require("../../utilities");

/**
 * @type {import("../../structures/Wanker").Command}
 */
module.exports = {
    command: ["tourney", "tournament"], id: "tourney_fetch",
    cooldown: {
        user: 3000
    },

    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithoutFlags}
     */
    preCheck: ({ msg }) => {
        if (msg.guildID !== "565155762335383581") return false;

        return true;
    },

    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithoutFlags}
     */
    handler: async ({ client, msg, db, browser }) => {
        if (!browser.initialised) { msg.createReaction("⌛"); return true; }

        return msg.channel.createMessage({
            files: [{
                name: "screenshot.png", contents: await browser.getTournamentShot()
            }], messageReference: { messageID: msg.id, failIfNotExists: false }
        });
    }
}