require("dotenv").config();

const inProduction = process.env.NODE_ENV === "production";

const logger = new (require("./manager/logger"))(inProduction ? "/data/log/" : "./log/");
const storage = new (require("./manager/storage"))();

const { readdirSync, statSync, existsSync, mkdirSync } = require("fs");
const Wanker = require("./structures/Wanker");

const client = new Wanker("Bot " + process.env.DISCORD_CLIENT_TOKEN);

const database = new (require("./manager/database"))(inProduction ? "/data/main.db" : "./main.db", logger, client);

module.exports = {
    client, logger, storage, database, inProduction
}

process.on('uncaughtException', (err) => {
    console.log("V --- UNCAUGHT EXCEPTION --- V");
    logger.error(err);
    console.log("^ --- UNCAUGHT EXCEPTION --- ^");
})

if (!existsSync('./cache/')) mkdirSync('./cache/');

readdirSync("./handler/").forEach((name) => {//.filter(name => name.endsWith('.js')).forEach((name) => {
    if (!name.endsWith(".js")) return;

    require("./handler/" + name)(client);
});

readdirSync("./event/").forEach((name) => {//.filter(name => name.endsWith('.js')).forEach((name) => {
    if (!statSync('./event/' + name).isDirectory()) return;

    readdirSync("./event/" + name).filter(file => file.endsWith('.js')).forEach((file) => {
        let okei = (require('./event/' + name + '/' + file))(module.exports);

        if (okei) {
            Object.keys(okei).forEach(ok => reserves[ok] = okei[ok]);
        }
    })
});

client.connect().then(() => client.connectedAt = Date.now());
