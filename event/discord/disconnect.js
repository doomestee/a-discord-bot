/**
 * @param {import("../../index")} stuff
 */
module.exports = (stuff) => {

    const {client} = stuff;

    client.on('disconnect', () => {
        client.connectedAt = Date.now();
    });
}