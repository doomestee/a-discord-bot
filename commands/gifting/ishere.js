/**
 * @type {import("../../structures/Wanker").Command}
 */
module.exports = {
    trigger: [/\b(?:is|has)?\s*(?:the\s*)?(?:gifting\s*)?(?:event|season)?\s*(?:here|on)\b/],

    cooldownRespond: () => {
        return;
    }, id: "gifting_check",

    cooldown: {
        user: 1000*60*60*24,
        channel: 1000*60*3
    },

    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithoutFlags}
     */
    preCheck: ({ msg }) => {
        if (msg.guildID !== "565155762335383581" && msg.guildID !== "293099269064359936") return false;
        //if (msg.channelID === "293099269064359936") return false;

        return true;
    },

    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithoutFlags}
     */
    handler: async ({ client, msg }) => {
        const date = new Date();

        if (date > new Date(2023, 11, 4, 15)) return; // It's already that time!

        return msg.channel.createMessage({
            content: "no.",
            messageReference: { messageID: msg.id, failIfNotExists: true }
        }).catch(() => {});

        //return msg.createReaction("monopolono:1176288221605396651");
    }
}