const chalk = require("chalk");

/**
 * @param {import("../../index")} stuff
 */
module.exports = (stuff) => {

    const {client, logger} = stuff;

    client.on('error', (error, id) => {
        //if (error.message === 'Connection reset by peer') return logger.info(`Shard ${id} has been reset by Discord - reconnecting automatically.`, chalk.greenBright, false);

        switch (error.code) {
            case 1006:
                client.connectedAt = Date.now();
                return logger.info(`Shard ${id} has been reset by Discord - reconnecting automatically.`, chalk.greenBright, true);
            default:
                return logger.error(error);
        }
    });
}