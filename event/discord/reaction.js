/**
 * @param {import("../../index")} stuff
 */
module.exports = (stuff) => {

    const { client, database } = stuff;

    client.on('messageReactionAdd', async (msg, reactor, reaction) => {
        if (!msg.guildID) return;
        if (database.isChannelSnipable(msg.channelID, msg.guildID) === 0) return;
        if (reactor.bot) return;

        if (client.cache.reactions.length > 100) client.cache.reactions.splice(0, 1);

        client.cache.reactions.push({
            emoji: { ...reaction },
            message: { id: msg.id },
            reactedAt: Date.now(),
            user: {
                id: reactor.id,
                name: reactor.displayName || reactor.username,
                avatarURL: reactor.avatarURL()
            },
            channel: {
                id: msg.channelID
            }, guild: {
                id: msg.guildID
            }
        })
    });

    client.on("messageReactionRemove", (msg, reactor, emoji) => {
        if (client.debug) { console.log("Reaction Removed: ", [msg.id, emoji, reactor.id])};
        let reactionIndex = client.cache.reactions.findIndex(v => v.guild.id === msg.guildID && v.message.id === msg.id && (v.emoji.id === null) ? v.emoji.name === emoji.name : v.emoji.id === emoji.id && v.user.id === reactor.id);

        if (reactionIndex !== -1) {
            let reaction = client.cache.reactions.splice(reactionIndex, 1)[0];

            client.cache.removed_reaction.push({
                emoji, reactedAt: reaction.reactedAt, removedAt: new Date(), user: reaction.user,
                message: { id: msg.id }, channel: { id: reaction.channel.id }, guild: { id: reaction.guild.id }
            });
        }
    })
}