//const chalk = require("chalk");

const { Constants } = require("oceanic.js");
const undici = require("undici");
const path = require("path");
const fs = require("fs/promises");

const extraOut = (v) => {
    if (v.startsWith("{")) {
        return JSON.parse(v);
    } else return {};
}

/**
 * @param {import("../../index")} stuff
 */
module.exports = (stuff) => {
    const {client, logger, database, inProduction} = stuff;

    client.once('ready', () => {
        client.loadJSON(path.resolve(inProduction ? "/data/cache.json" : "./data/cache.json"), {deletedMsg: [], editedMsg: []}, "msg");

        // Store cache in backup, for up to 10 copies.

        fs.readdir(inProduction ? "/data/cache_backup" : "./data/cache_backup")
            .then(v => {
                let date = new Date();

                let dateTLS = date.toLocaleDateString("en-gb").split("/").join("-");

                if (v.some(g => g.slice(0, 10) === dateTLS.slice(0, 10))) return false; // ignore as there's already a backup for today.

                if (v.length > 9) {
                    let list = v.splice(-9);

                    // too much thinking, using 0.1% of brain power

                    // eg file name: 01-01-2023-20:25:59.json

                    //let count = 0; let prevName = "";
                    for (let i = 0; i < v.length; i++) {//i = v.length; i >= 0 && count < 10; i++) {
                        let file = v[i];

                        //if (prevName !== "") prevName = file; //else {

                        //}
                        if (list.includes(v[i])) continue;

                        fs.rm((inProduction ? "/data/cache_backup/" : "./data/cache_backup/") + file).catch(err => { logger.error({error: err, list, v}) });
                    }
                }

                return fs.copyFile(inProduction ? "/data/cache.json" : "./data/cache.json", (inProduction ? "/data/cache_backup/" : "./data/cache_backup/") + date.toLocaleDateString("en-gb").split("/").join("-") + "-" + date.toLocaleTimeString("en-gb") + ".json");
            }, v => {
                if (v.code !== "ENOENT") return logger.error(v);
                return fs.mkdir(inProduction ? "/data/cache_backup" : "./data/cache_backup");
            }).catch(v => logger.error(v));
    })

    client.on('ready', () => {
        //logger.info("Bot is up and ready to go!");// + ((mongo.isConnected()) ? '!' : ', mongo instance is being powered up at the moment...'));
        logger.info(`Bot took ${(Date.now() - client.connectedAt)/1000} seconds to connect!`);

        client.editStatus("online", [{ type: Constants.ActivityTypes.WATCHING, name: "a bunch of men fisting", url: "https://challonge.com/kh1no18r" }]);

        /*client.status = [0, 0];

        clearInterval(client.interval);
        
        client.interval = setInterval(() => {
            client.status[0] = 1;
            return client.editStatus("online", [{name: "ArcadeBot", type: 0}]);
        }, 20000);*/
        //client.editStatus("dnd", {name: "⚠️ Bot currently under maintenance ⚠️", type: 0});

        return;
    });
}