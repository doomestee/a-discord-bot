/**
 * @type {import("../../structures/Wanker").Command}
 */
module.exports = {
    trigger: [/(?:how).{1,}(?:open)\s*(?:gifting|gift|gifts)\s*(?:fast)?/i],

    cooldownRespond: () => {
        return;
    }, id: "gifting_open",

    cooldown: {
        user: 1000*60*60*24,
        channel: 1000*60*3
    },

    /**
     * @type {import("../../structures/Wanker").PreCheckFunc}
     */
    preCheck: ({ msg }) => {
        if (msg.guildID !== "565155762335383581" && msg.guildID !== "293099269064359936") return false;
        //if (msg.channelID === "293099269064359936") return false;

        return true;
    },

    /**
     * @type {import("../../structures/Wanker").HandlerFuncWithoutFlags}
     */
    handler: async ({ client, msg, captured }) => {
        const date = new Date();

        if (date > new Date(2023, 11, 4, 15)) return; // It's already that time!

        return msg.channel.createMessage({
            content: "Use /open1000gifts to open 1000 gifts.",
            messageReference: { messageID: msg.id, failIfNotExists: true }
        }).catch(() => {});

        //return msg.createReaction("monopolono:1176288221605396651");
    }
}