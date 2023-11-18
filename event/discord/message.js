const {regexes, flaginator } = require("../../utilities");
const { request } = require("undici");
const { createWriteStream } = require("fs");
const { mkdir, readFile, rm } = require("fs/promises");
const { pipeline } = require("stream/promises");
const { resolve } = require("path");
const EncryptionHandler = require("../../utilities/EncryptHandler");
const { MessageTypes, ComponentTypes, ButtonStyles } = require("oceanic.js");

/**
 * @param {string} content 
 * @returns 
 */
let escape = (content) => {
    if (typeof content !== "string") return content;

    if (!content.length) return "No content.";

    return content.trim()
    //    .replace(/\\/gi, "\\\\")
    //    .replace(/<strong [^>]*>/gi, "**")
    //    .replace(/<b>|<\/b>/gi, "**")(//)
}

/**
 * @param {import("../../index")} stuff
 */
module.exports = (stuff) => {

    const {client, logger, database, storage} = stuff;

    client.on('messageCreate', async (msg) => {
        let msgref = { messageReference: { messageID: msg.id }, failIfNotExists: false };
        
        if (!msg.guildID) return;

        let cunted = msg.content.toLowerCase();

        if (msg.author && msg.author.bot) return;
        if (msg.member && msg.member.user.bot) return;

        let snipable = database.isChannelSnipable(msg.channelID, msg.guildID);//client.messages[0].value.whites.some(v => v === msg.channel.id);

        const blacklist = await database.isBlacklisted(msg.author.id);

        console.log("s", snipable);
        console.log("b", blacklist[0]);

        if (blacklist[0] === 0 && snipable === 2) {
            let flagStart = false;

            if ((msg.member.permissions.has("MANAGE_MESSAGES") || client.isMaintainer(msg.author.id)) && ["snipe dump", "esnipe dump", "rsnipe dump", "cache dump"].some(v => cunted === v)) {
                let plunges = [0, 0, 0];

                switch (cunted.split(" ")[0]) {
                    case "snipe": plunges[0] = client.jsons.msg.value.deletedMsg.length; client.jsons.msg.value.deletedMsg = [];
                    case "esnipe": if (cunted.startsWith("es")) { plunges[1] = client.jsons.msg.value.editedMsg.length; client.jsons.msg.value.editedMsg = []; }
                        client.jsons.msg.saveQueue();
                        break;
                    case "rsnipe":
                        plunges[2] = client.cache.removed_reaction.length;
                        client.cache.removed_reaction = [];
                        break;
                    case "cache":
                        plunges[0] = client.jsons.msg.value.deletedMsg.length; client.jsons.msg.value.deletedMsg = [];
                        plunges[1] = client.jsons.msg.value.editedMsg.length; client.jsons.msg.value.editedMsg = [];
                        client.jsons.msg.saveQueue();
                        plunges[2] = client.cache.removed_reaction.length; client.cache.removed_reaction = []; 
                        break;
                }

                return client.rest.channels.createMessage(msg.channelID, {
                    content: `Plunged the following cache:\n${plunges[0] ? `snipe - ${plunges[0]} (to be deleted).\n` : ""}${plunges[1] ? `esnipe - ${plunges[1]} (to be deleted)\n` : ""}${plunges[2] ? `rsnipe - ${plunges[2]}\n` : ""}` + (client.isMaintainer(msg.author.id) ? "" : "\nNote that this is an irreversible process."),
                    ...msgref
                })
            }

            const cuntedSplit = cunted.split(" "); let flagible = () => { return cuntedSplit.every(v => {
                    if (v === "snipe" || v === "esnipe" || v === "rsnipe") return true;
                    if (v.startsWith("-") && !v.startsWith("--")) { flagStart = true; return true; } // no support for longer flag
                    if (flagStart) { if (!v.endsWith(",")) flagStart = false; return true; }
                    return false;
                });
            }

            if (["snipe ", "esnipe ", "rsnipe "].some(v => cunted.startsWith(v)) && flagible()) {
                const flags = flaginator(cunted);

                let blacklist = await database.isBlacklisted(msg.author.id);

                if (blacklist[0] === 1) {
                    if (client.temporary.blacked?.includes(msg.author.id)) return;

                    client.rest.channels.createMessage(msg.channel.id, {
                        messageReference: {
                            messageID: msg.id, failIfNotExists: false
                        }
                    });
                    
                    if (!client.temporary.blacked) client.temporary.blacked = [];
                    client.temporary.blacked.push(msg.author.id);
                    return;
                }

                let tempo = client.temporary.uses[msg.author.id];
                let nowDate = Date.now();
                if (tempo && !client.isMaintainer(msg.author.id)) {// && !["vendbot", "bot"].some(v => (msg.channel) ? msg.channel.name.toLowerCase().includes(v) : false)) {
                    if (client.temporary.blacks[msg.author.id] && Date.now() < (client.temporary.blacks[msg.author.id][0] + 30000)) return;
                    
                    if (tempo[0].length >= 10 && tempo[0].every(v => (v + (1000*30)) > nowDate)) {
                        let blackEndDate = nowDate + 1000*60*30;

                        // Ginger
                        if (["950028793450483712"].some(v => msg.author.id === v)) blackEndDate = nowDate + 1000*60*15;
                        // Kimo
                        else if (["540224423567949834"].some(v => msg.author.id === v)) blackEndDate = nowDate + 1000*60*60;

                        await database.addblacklistID(msg.author.id, 0, "AUTOMATIC", [new Date(), new Date(blackEndDate)]);
                        client.temporary.blacks[msg.author.id] = [Date.now(), blackEndDate];
                        
                        return client.rest.channels.createMessage(msg.channel.id, {
                            messageReference: {
                                messageID: msg.id, failIfNotExists: false,
                            }, content: "You've been automatically blacklisted from using the bot."
                        });
                    }

                    if (tempo[0].length >= 10) client.temporary.uses[msg.author.id][0].splice(0, 1);

                    client.temporary.uses[msg.author.id][0].push(nowDate);
                } else if (!tempo) client.temporary.uses[msg.author.id] = [[nowDate]]

                /**
                 * @type {import("oceanic.js").EmbedOptions[]}
                 */
                let embeds = [{description: "No messages left."}];

                let criteria = null;

                /**
                 * @param {string} flagStr
                 */
                const flagSpliter = (flagStr) => {
                    const flagSplit = flagStr.split(",");
                    let listIDs = [];

                    for (let i = 0; i < flagSplit.length; i++) {
                        let id = flagSplit[i].trim();

                        id = id.match(regexes.snowflake);

                        if (id?.length) listIDs.push(...id);
                    }; return listIDs;
                }

                if (flags.length) {
                    // TODO: add support for multiple flags
                    for (let i = 0; i < flags.length; i++) {
                        switch (flags[0][0]) {
                            case "l":
                                if (["", "true", "1"].some(v => v === flags[0][1])) criteria = true;
                                else if (!["false", "0"].some(v => v === flags[0][1])) return client.rest.channels.createMessage(msg.channelID, {
                                    ...msgref,
                                    content: "The flag `-l boolean` is loop, if set to true, it will loop backward until it reaches a message whose content isn't the same as the start message (at the end), this is to remove any duplicates.\nNote: this doesn't include any dupe msgs with attachments for now.\nExample usage: `snipe -l true`, `snipe -l`"
                                })
                                break;
                            case "i":
                                if (flags[0][1] === "") { criteria = msg.channelID; break; }

                                criteria = flagSpliter(flags[0][1]);
                                break;
                            case "u":
                                if (flags[0][1] === "") { criteria = [2, msg.author.id]; break; }

                                criteria = [2, ...flagSpliter(flags[0][1])];
                                break;
                            default:
                                return client.rest.channels.createMessage(msg.channelID, {
                                    ...msgref,
                                    content: 'Supported flags: `-l boolean`, `-i List<ChannelId>`, `-u List<UserId>`.\nList must be a string, each element separated by a comma.'
                                });
                        }
                    }
                }

                // 304683721154494465 is bot-commands channel in ed server
                if (criteria === null && msg.channelID !== "304683721154494465" && msg.guildID === "293099269064359936")
                    criteria = [false, "304683721154494465"];

                // 126414557819174912 is roman ID
                if (criteria === null && msg.author.id === "126414557819174912")
                    criteria = [2, "126414557819174912"]

                /**
                 * @type {import("../../structures/Wanker").DeletedMessage|import("../../structures/Wanker").EditedMessage|import("../../structures/Wanker").RemovedReaction|{type: 4, messages: import("../../structures/Wanker").DeletedMessage[]}}
                 */
                let stuff = cuntedSplit[0] === "snipe" ? client.snipe(msg.guildID, undefined, undefined, undefined, criteria) : cuntedSplit[0] === "esnipe" || cuntedSplit[0] === "edit snipe" ? client.esnipe(msg.guildID) : client.rsnipe(msg.guildID);

                if (stuff?.success === false) return client.rest.channels.createMessage(msg.channelID, {
                    ...msgref, content: "There's no more message that meets the criteria to snipe."
                });

                if (stuff && criteria === true && stuff.length) {
                    if (stuff.length === 1) stuff = stuff[0];
                    else stuff = { messages: stuff, type: 4 };
                }

                /**
                 * @param {Date} date 
                 */
                let lazyFormatTime = (date) => {date = (date instanceof Date) ? date : new Date(date); return `<t:${Math.floor(date.getTime() / 1000)}:T> <t:${Math.floor(date.getTime() / 1000)}:D>`; }

                let contentify = (texto, wrapIfSuccess="```") => {
                    try {
                        return ((wrapIfSuccess) ? wrapIfSuccess + "\n" : "") + EncryptionHandler.decrypt(texto) + wrapIfSuccess;
                    } catch (err) {
                        logger.error(err);
                        return "Decrypting the content was unsuccessful, the error has been logged.";
                    }
                }

                /**
                 * @param {import("oceanic.js").PartialEmoji} emoji 
                 */
                let parseEmoji = (emoji) => {
                    if (emoji.id === null) return "`" + emoji.name + "`";
                    if (!emoji.animated) return "<:" + emoji.name + ":" + emoji.id + ">";
                    return "<a:" + emoji.name + ":" + emoji.id + ">";
                }

                if (stuff && stuff.type === 1) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Message deleted in #" + stuff.channel.name, description: escape(contentify(stuff.content)), fields: [{name: "Posted At", value: lazyFormatTime(stuff.dates.postedAt), inline: true}, {name: "Deleted At", value: lazyFormatTime(stuff.dates.deletedAt), inline: true}], color: 0xFF0000}]
                else if (stuff && stuff.type === 2) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Message edited in #" + stuff.channel.name, description: `Old: ${escape(contentify(stuff.contents.old))} New: ${escape(contentify(stuff.contents.new))}`, fields: [{name: "Posted At", value: lazyFormatTime(stuff.dates.postedAt), inline: true}, {name: "Edited at", value: lazyFormatTime(stuff.dates.editedAt), inline: true}], color: 0xFFFF00}]
                else if (stuff && stuff.type === 3) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Reaction removed", fields: [{ name: "Emoji", value: parseEmoji(stuff.emoji) }, {name: "Reacted at", value: lazyFormatTime(stuff.reactedAt), inline: true}, { name: "Removed At", value: lazyFormatTime(stuff.removedAt)}], color: 0x00FFFF}]
                else if (stuff && stuff.type === 4) embeds = [{ author: {name: stuff.messages[0].user.name, iconURL: stuff.messages[0].user.avatarURL}, title: "Message deleted in #" + stuff.messages[0].channel.name, description: escape(contentify(stuff.messages[0].content)), fields: [{ name: "Duplicate Count", value: stuff.messages.length, inline: true }], color: 0xAA0000}]

                if (stuff && stuff.type === 3) {
                    let emojiURL = "https://cdn.discordapp.com/emojis/" + stuff.emoji.id + "." + ((stuff.emoji.animated) ? "gif" : "png") + "?size=256&quality=lossless";

                    if (stuff.emoji.id) embeds[0].thumbnail = { url: emojiURL };
                }

                let userId = (stuff && stuff.type !== 4) ? stuff.user.id : null;//(stuff && stuff.type !== 3) ? stuff.userId : (stuff) ? stuff.user.id : null;
                
                if (stuff?.type === 4) userId = stuff.messages[0].user.id;

                /**
                 * @param {{[stuff: string]: string}} obj 
                 */
                let lazyFunc2 = (obj) => { for (let i of Object.entries(obj)) { embeds[0][i[0]] = i[1]; }}

                if (stuff && new Date().getDate() === 1 && new Date().getMonth() === 3) {
                    const uName = (stuff.type === 4) ? stuff.messages[0].user.name : stuff.user.name;

                    switch (userId) {
                        // Ginger
                        case "950028793450483712": lazyFunc2({ author: { name: "Depresso", iconURL: "https://i.pinimg.com/474x/12/55/56/12555689c8e6008d3d650ca7183ebf90.jpg"}}); break;
                        // Kimo
                        case "540224423567949834":
                            if (["chanel", "dick", "dik", "pp", "cum", "sex", "fuk", "fuck", "long", "fit"].some(v => cunted.includes(v))) {
                                lazyFunc2({ author: { name: uName, iconURL: "https://i.pinimg.com/280x280_RS/ed/26/18/ed2618b3f2f211a7c60c8bfb35b79c15.jpg"}}); break;
                            } else lazyFunc2({ author: { name: uName, iconURL: "https://d.newsweek.com/en/full/1904169/paul-miller-gypsy-crusader.jpg?w=1600&h=1200&q=88&f=bc7d037b1f0cd4aa131da74eb054563b" }}); break;
                        // Chanel
                        case "792135889157095466": lazyFunc2({ author: { name: "Cuckoo Chanel", iconURL: "https://www.asiamediajournal.com/wp-content/uploads/2022/11/Harley-Quinn-and-Joker-Matching-PFP-Profile.jpg" }}); break;
                    }
                }

                if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "🐴") lazyFunc2({ color: 0xB76E54, title: "Horse deleted in #" + stuff.channel.name});
                else if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "💀") lazyFunc2({ color: 0xCFD7DD, title: "Skull deleted in #" + stuff.channel.name});
                else if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "☠️") lazyFunc2({ color: 0xCFD7DD, title: "Mega Skull deleted in #" + stuff.channel.name});

                if (stuff && stuff.reversed === true) {
                    let lazyFunc = (title, color) => { embeds[0].title = title; embeds[0].color = color; };

                    switch (userId) {
                        case "254760236034949120": lazyFunc("Anti Mauxy: Deleted in #" + stuff.channel.name, 0xE810A7); break;
                        case "346018784101793793": lazyFunc("Anti xDDDD: Deleted in #" + stuff.channel.name, 0x4490F7); break;
                        case "381779063070785536": lazyFunc("Anti Meer: Deleted in #" + stuff.channel.name, 0x000000); break;
                        default: lazyFunc("Test Test", 0x1DF287); break;
                    };
                }

                /**
                * @type {import("oceanic.js").File[]}
                */
                let files = [];

                let eStuff = (stuff?.type === 4) ? stuff.messages[0] : stuff;

                let components = (stuff === null || stuff.type === 4) ? [] : [{
                    type: 1, components: [{
                        url: "https://discord.com/channels/" + stuff.guild.id + "/" + (stuff.channel.id) + "/" + ((stuff.type !== 3) ? stuff.id : stuff.message.id), type: 2, style: 5, label: "Original Message"
                    }]
                }];

                if (stuff.type === 4) {
                    let mossonges = [];
                    for (let i = 0; i < stuff.messages.length; i++) {
                        let moss = stuff.messages[i];

                        delete moss["attachments"];
                        delete moss["content"];

                        mossonges.push(moss);
                    }

                    //let file = storage.writeFile("sniped/" + msg.id + ".json", JSON.stringify(mossonges, undefined, 2)).catch((err) => { logger.error(err); return {error: err} });

                    //if (!file.error) {
                        //if (file.$metadata.httpStatusCode >= 200)
                        /*components = [{
                            type: 1, components: [{
                                url: "https://i.doomester.one/sniped/" + msg.id + ".json", style: ButtonStyles.LINK,
                                label: "Messages (JSON)", type: ComponentTypes.BUTTON
                            }]
                        }];*/ // screw it, we balling
                    //}
                }

                if (eStuff && ((eStuff.type === 1 && eStuff.reference && eStuff.reference.id !== -1 && eStuff.reference.id != null) || stuff.type === 4 && stuff.messages.some(v => v.reference?.id !== -1 && v.reference?.id != null))) {
                    if (stuff.type === 4) {
                        let replieds = [];
                        for (let i = 0; i < stuff.messages.length; i++) {
                            replieds.push(stuff.messages[i].reference.userName);
                        }; replieds = [...new Set(replieds)];

                        embeds[0]['fields'].push({name: "Replied to", value: replieds.join(", ").slice(0, 10) + ((replieds.length > 9) ? ".\nMaximum amount of users can be outputted." : "")});
                    } else {
                        embeds[0]['fields'].push({name: "Replied to", value: (stuff?.reference.userName) ? `${stuff?.reference.userName}` : "Uncached user."});
                        if (stuff.type !== 4) components[0].components.push({url: "https://discord.com/channels/" + stuff.guild.id + "/" + stuff.channel.id + "/" + stuff.reference.id, type: 2, style: 5, label: "Referenced Message"});
                    }
                }

                if (eStuff && ((eStuff.type === 1 && stuff.mentions && stuff.mentions.n.length > 0) || stuff.type === 4 && stuff.messages.some(v => v.mentions?.n.length > 0))) {
                    if (stuff.type === 4) {
                        /**
                         * @type {{[userID: string]: string}}
                         */
                        let name = {};
                        for (let i = 0; i < stuff.messages.length; i++) {
                            for (let x = 0; x < stuff.messages[i].mentions.i.length; x++) {
                                name[stuff.messages[i].mentions.i[x]] = stuff.messages[i].mentions.n[x];
                            }
                        };

                        let names = Object.values(name);

                        embeds[0]['fields'].push({name: "Mentioned", value: names.join(", ").slice(0, 25) + ((names.length > 9) ? ".\nMaximum amount of users can be outputted." : "")});
                    } else embeds[0]['fields'].push({name: "Mentioned", value: stuff.mentions.n.join(", ") });
                }

                if (stuff && stuff.type === 1 && stuff.attachments.length && !stuff.reversed) {

                    // For resolving readfile
                    /**
                    * @type {Buffer[]}
                    */
                    let promises = [];

                    for (let i = 0; i < stuff.attachments.length; i++) {
                        let attachment = stuff.attachments[i];

                        promises.push(readFile(`./cache/messages/${stuff.id}/${attachment.id}-${attachment.filename}`).catch((err) => { return "FRIP"; }));
                    }

                    promises = await Promise.all(promises);

                    for (let i = 0; i < promises.length; i++) {
                        let prom = promises[i];

                        if (prom === "FRIP") continue;
                        if (!(prom instanceof Buffer)) continue;

                        let attachment = stuff.attachments[i];
                        let attachIsImage = attachment.type?.includes("image") || ["png", "jpg", "jpeg", "gif"].some(v => attachment.filename.split(".")?.[1].includes(v));

                        files.push({
                            name: attachment.filename,
                            contents: promises[i]
                        });

                        if (embeds[0].image) {
                            if (attachIsImage) {
                                embeds.push({ url: "https://google.com/", image: { url: "attachment://" + attachment.filename } });

                                if (embeds.length > 4 && embeds[0].footer?.text.includes("2")) {
                                    embeds[0].footer = { text: "There are more than 4 images, click on an image above to browse." }
                                } else if (embeds.length > 2 && !embeds[0].footer) {
                                    embeds[0].footer = { text: "There are more than 2 images, click on an image above to browse." }
                                }
                            }
                        } else if (attachIsImage) {
                            embeds[0].image = { url: "attachment://" + attachment.filename };
                            if (promises.length > 1) embeds[0].url = "https://google.com/";
                        }
                    }
                }

                //embeds[0].footer = { text: "This is a beta feature." };

                if (stuff && stuff.type === 1 && stuff.edited) embeds[0].footer = { text: "The message was edited before deleted." };

                return client.rest.channels.createMessage(msg.channel.id, {
                    embeds, messageReference: {messageID: msg.id, failIfNotExists: false},
                    components, files
                }).then((res) => {
                    if (client.cache.sniped.length > 4) client.cache.sniped.splice(0, 1);

                    if (stuff) client.cache.sniped.push([res.id, res.channelID, {...stuff, attachments: []}]);
                    if (stuff && stuff.attachments && stuff.attachments.length) rm("./cache/messages/" + stuff.id, { recursive: true }).catch((err) => { console.log("Unable to remove sniped messages' attachments."); logger.error(err); });
                }, (err) => {
                    if (err.code === 50013) {
                        let nice = cunted === "snipe" ? client.snipe(msg.guildID, true, stuff, false) : cunted === "esnipe" || cunted === "edit snipe" ? client.esnipe(msg.guildID, true, stuff, false) : client.rsnipe(msg.guildID, true, stuff, false);
                    } else logger.error(err);
                })

            } else if (["snipe count", "esnipe count", "edit snipe count", "rsnipe count", "reaction snipe count"].some(v => v === cunted)) {
                if (cunted.endsWith("count")) {
                    if (cunted.startsWith("esnipe") || cunted.startsWith("edit")) return client.rest.channels.createMessage(msg.channel.id, {content: "Local: " + client.cache.edited_msg.length + ", File: " + client.jsons.msg.value.editedMsg.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                    if (cunted.startsWith("snipe")) return client.rest.channels.createMessage(msg.channel.id, {content: "Local: " + client.cache.deleted_msg.length + ", File: " + client.jsons.msg.value.deletedMsg.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                    if (cunted.startsWith("rsnipe") || cunted.startsWith("reaction")) return client.rest.channels.createMessage(msg.channel.id, {content: client.cache.removed_reaction.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                }
            }
            // legacy support
            else if (["snipe", "esnipe", "edit snipe", "snipe count", "edit snipe count", "esnipe count", "rsnipe", "reaction snipe", "rsnipe count", "reaction snipe count"].some(v => v === cunted) && snipable === 2) {
                let blacklist = await database.isBlacklisted(msg.author.id);

                if (blacklist[0] === 1) {
                    if (client.temporary.blacked?.includes(msg.author.id)) return;

                    if (msg.channelID === "293099269064359936") return;

                    client.rest.channels.createMessage(msg.channel.id, {
                        messageReference: {
                            messageID: msg.id, failIfNotExists: false
                        }, content: "You're blacklisted from using the bot."
                    });
                    
                    if (!client.temporary.blacked) client.temporary.blacked = [];
                    client.temporary.blacked.push(msg.author.id);
                    return;
                }

                if (!client.temporary.uses) client.temporary.uses = {};

                let tempo = client.temporary.uses[msg.author.id];
                let nowDate = Date.now();
                if (tempo && !client.isMaintainer(msg.author.id)) {// && !["vendbot", "bot"].some(v => (msg.channel) ? msg.channel.name.toLowerCase().includes(v) : false)) {
                    if (client.temporary.blacks[msg.author.id] && Date.now() < (client.temporary.blacks[msg.author.id][0] + 30000)) return;
                    
                    if (tempo[0].length >= 10 && tempo[0].every(v => (v + (1000*30)) > nowDate)) {
                        let blackEndDate = nowDate + 1000*60*30;

                        // Ginger
                        if (["950028793450483712"].some(v => msg.author.id === v)) blackEndDate = nowDate + 1000*60*15;
                        // Kimo
                        else if (["540224423567949834"].some(v => msg.author.id === v)) blackEndDate = nowDate + 1000*60*60;

                        await database.addblacklistID(msg.author.id, 0, "AUTOMATIC", [new Date(), new Date(blackEndDate)]);
                        client.temporary.blacks[msg.author.id] = [Date.now(), blackEndDate];
                        
                        return client.rest.channels.createMessage(msg.channel.id, {
                            messageReference: {
                                messageID: msg.id, failIfNotExists: false,
                            }, content: "You've been automatically blacklisted from using the bot."
                        });
                    }

                    if (tempo[0].length >= 10) client.temporary.uses[msg.author.id][0].splice(0, 1);

                    client.temporary.uses[msg.author.id][0].push(nowDate);
                } else if (!tempo) client.temporary.uses[msg.author.id] = [[nowDate]]

                if (cunted.endsWith("count")) {
                    if (cunted.startsWith("esnipe") || cunted.startsWith("edit")) return client.rest.channels.createMessage(msg.channel.id, {content: "Local: " + client.cache.edited_msg.length + ", File: " + client.jsons.msg.value.editedMsg.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                    if (cunted.startsWith("snipe")) return client.rest.channels.createMessage(msg.channel.id, {content: "Local: " + client.cache.deleted_msg.length + ", File: " + client.jsons.msg.value.deletedMsg.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                    if (cunted.startsWith("rsnipe") || cunted.startsWith("reaction")) return client.rest.channels.createMessage(msg.channel.id, {content: client.cache.removed_reaction.length, messageReference: { messageID: msg.id, failIfNotExists: true}}).catch(() => {});
                }

                /**
                 * @type {import("oceanic.js").EmbedOptions[]}
                 */
                let embeds = [{description: "No messages left."}]
                let criteria = [false, "304683721154494465"];

                // 304683721154494465 is bot-commands channel in ed server
                if (msg.channelID === "304683721154494465" && msg.guildID === "293099269064359936") criteria = null;

                // 126414557819174912 is roman ID
                if (msg.author.id === "126414557819174912") criteria = [2, "126414557819174912"];

                let stuff = cunted === "snipe" ? client.snipe(msg.guildID, criteria) : cunted === "esnipe" || cunted === "edit snipe" ? client.esnipe(msg.guildID, undefined, undefined, undefined, criteria) : client.rsnipe(msg.guildID);

                if (stuff?.success === false) return client.rest.channels.createMessage(msg.channelID, {
                    ...msgref, content: "There's no more message that meets the criteria to snipe."
                });

                /**
                 * @param {Date} date 
                 */
                let lazyFormatTime = (date) => {date = (date instanceof Date) ? date : new Date(date); return `<t:${Math.floor(date.getTime() / 1000)}:T> <t:${Math.floor(date.getTime() / 1000)}:D>`; }

                let contentify = (texto, wrapIfSuccess="```") => {
                    try {
                        return ((wrapIfSuccess) ? wrapIfSuccess + "\n" : "") + EncryptionHandler.decrypt(texto) + wrapIfSuccess;
                    } catch (err) {
                        logger.error(err);
                        return "Decrypting the content was unsuccessful, the error is logged.";
                    }
                }

                /**
                 * @param {import("oceanic.js").PartialEmoji} emoji 
                 */
                let parseEmoji = (emoji) => {
                    if (emoji.id === null) return "`" + emoji.name + "`";
                    if (!emoji.animated) return "<:" + emoji.name + ":" + emoji.id + ">";
                    return "<a:" + emoji.name + ":" + emoji.id + ">";
                }

                if (stuff && stuff.type === 1) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Message deleted in #" + stuff.channel.name, description: escape(contentify(stuff.content)), fields: [{name: "Posted At", value: lazyFormatTime(stuff.dates.postedAt), inline: true}, {name: "Deleted At", value: lazyFormatTime(stuff.dates.deletedAt), inline: true}], color: 0xFF0000}]
                else if (stuff && stuff.type === 2) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Message edited in #" + stuff.channel.name, description: `Old: ${escape(contentify(stuff.contents.old))} New: ${escape(contentify(stuff.contents.new))}`, fields: [{name: "Posted At", value: lazyFormatTime(stuff.dates.postedAt), inline: true}, {name: "Edited at", value: lazyFormatTime(stuff.dates.editedAt), inline: true}], color: 0xFFFF00}]
                else if (stuff && stuff.type === 3) embeds = [{ author: {name: stuff.user.name, iconURL: stuff.user.avatarURL}, title: "Reaction removed", fields: [{ name: "Emoji", value: parseEmoji(stuff.emoji) }, {name: "Reacted at", value: lazyFormatTime(stuff.reactedAt), inline: true}, { name: "Removed At", value: lazyFormatTime(stuff.removedAt)}], color: 0x00FFFF}]

                if (stuff && stuff.type === 3) {
                    let emojiURL = "https://cdn.discordapp.com/emojis/" + stuff.emoji.id + "." + ((stuff.emoji.animated) ? "gif" : "png") + "?size=256&quality=lossless";

                    if (stuff.emoji.id) embeds[0].thumbnail = { url: emojiURL };
                }

                let userId = (stuff) ? stuff.user.id : null;//(stuff && stuff.type !== 3) ? stuff.userId : (stuff) ? stuff.user.id : null;

                /**
                 * @param {{[stuff: string]: string}} obj 
                 */
                let lazyFunc2 = (obj) => { for (let i of Object.entries(obj)) { embeds[0][i[0]] = i[1]; }}

                if (stuff && new Date().getDate() === 1 && new Date().getMonth() === 3) {
                    switch (userId) {
                        // Ginger
                        case "950028793450483712": lazyFunc2({ author: { name: "Depresso", iconURL: "https://i.pinimg.com/474x/12/55/56/12555689c8e6008d3d650ca7183ebf90.jpg"}}); break;
                        // Kimo
                        case "540224423567949834":
                            if (["chanel", "dick", "dik", "pp", "cum", "sex", "fuk", "fuck", "long", "fit"].some(v => cunted.includes(v))) {
                                lazyFunc2({ author: { name: stuff.user.name, iconURL: "https://i.pinimg.com/280x280_RS/ed/26/18/ed2618b3f2f211a7c60c8bfb35b79c15.jpg"}}); break;
                            } else lazyFunc2({ author: { name: stuff.user.name, iconURL: "https://d.newsweek.com/en/full/1904169/paul-miller-gypsy-crusader.jpg?w=1600&h=1200&q=88&f=bc7d037b1f0cd4aa131da74eb054563b" }}); break;
                        // Chanel
                        case "792135889157095466": lazyFunc2({ author: { name: "Cuckoo Chanel", iconURL: "https://www.asiamediajournal.com/wp-content/uploads/2022/11/Harley-Quinn-and-Joker-Matching-PFP-Profile.jpg" }}); break;
                    }
                }

                if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "🐴") lazyFunc2({ color: 0xB76E54, title: "Horse deleted in #" + stuff.channel.name});
                else if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "💀") lazyFunc2({ color: 0xCFD7DD, title: "Skull deleted in #" + stuff.channel.name});
                else if (stuff && stuff.type === 1 && contentify(stuff.content, "") === "☠️") lazyFunc2({ color: 0xCFD7DD, title: "Mega Skull deleted in #" + stuff.channel.name});

                if (stuff && stuff.reversed === true) {
                    let lazyFunc = (title, color) => { embeds[0].title = title; embeds[0].color = color; };

                    switch (userId) {
                        case "254760236034949120": lazyFunc("Anti Mauxy: Deleted in #" + stuff.channel.name, 0xE810A7); break;
                        case "346018784101793793": lazyFunc("Anti xDDDD: Deleted in #" + stuff.channel.name, 0x4490F7); break;
                        case "381779063070785536": lazyFunc("Anti Meer: Deleted in #" + stuff.channel.name, 0x000000); break;
                        default: lazyFunc("Test Test", 0x1DF287); break;
                    };
                }

                /**
                 * @type {import("oceanic.js").File[]}
                 */
                let files = [];

                let components = (stuff === null) ? [] : [{
                    type: 1, components: [{
                        url: "https://discord.com/channels/293099269064359936/" + (stuff.channel.id) + "/" + ((stuff.type !== 3) ? stuff.id : stuff.message.id), type: 2, style: 5, label: "Original Message"
                    }]
                }];

                if (stuff && stuff.type === 1 && stuff.reference && stuff.reference.id !== -1 && stuff.reference.id != null) {
                    embeds[0]['fields'].push({name: "Replied to", value: (stuff.reference.userName) ? `${stuff.reference.userName}` : "Uncached user."});
                    components[0].components.push({url: "https://discord.com/channels/293099269064359936/" + stuff.channel.id + "/" + stuff.reference.id, type: 2, style: 5, label: "Referenced Message"});
                }

                if (stuff && stuff.type === 1 && stuff.mentions && stuff.mentions.n.length > 0) {
                    //if (!(stuff.mentions.i.length === 1 && stuff.reference && stuff.reference.id === stuff.mentions.i[0]))
                    embeds[0]['fields'].push({name: "Mentioned", value: stuff.mentions.n.join(", ") });
                }

                if (stuff && stuff.type === 1 && stuff.attachments.length && !stuff.reversed) {

                    // For resolving readfile
                    /**
                     * @type {Buffer[]}
                     */
                    let promises = [];

                    for (let i = 0; i < stuff.attachments.length; i++) {
                        let attachment = stuff.attachments[i];

                        promises.push(readFile(`./cache/messages/${stuff.id}/${attachment.id}-${attachment.filename}`).catch((err) => { return "FRIP"; }));
                    }

                    promises = await Promise.all(promises);

                    for (let i = 0; i < promises.length; i++) {
                        let prom = promises[i];

                        if (prom === "FRIP") continue;
                        if (!(prom instanceof Buffer)) continue;

                        let attachment = stuff.attachments[i];
                        let attachIsImage = attachment.type?.includes("image") || ["png", "jpg", "jpeg", "gif"].some(v => attachment.filename.split(".")?.[1].includes(v));

                        files.push({
                            name: attachment.filename,
                            contents: promises[i]
                        });

                        if (embeds[0].image) {
                            if (attachIsImage) {
                                embeds.push({ url: "https://google.com/", image: { url: "attachment://" + attachment.filename } });

                                if (embeds.length > 4 && embeds[0].footer?.text.includes("2")) {
                                    embeds[0].footer = { text: "There are more than 4 images, click on an image above to browse." }
                                } else if (embeds.length > 2 && !embeds[0].footer) {
                                    embeds[0].footer = { text: "There are more than 2 images, click on an image above to browse." }
                                }
                            }
                        } else if (attachIsImage) {
                            embeds[0].image = { url: "attachment://" + attachment.filename };
                            if (promises.length > 1) embeds[0].url = "https://google.com/";
                        }
                    }
                }

                //embeds[0].footer = { text: "This is a beta feature." };

                if (stuff && stuff.type === 1 && stuff.edited) embeds[0].footer = { text: "The message was edited before deleted." };

                return client.rest.channels.createMessage(msg.channel.id, {
                    embeds, messageReference: {messageID: msg.id, failIfNotExists: false},
                    components, files
                }).then((res) => {
                    if (client.cache.sniped.length > 4) client.cache.sniped.splice(0, 1);

                    if (stuff) client.cache.sniped.push([res.id, res.channelID, {...stuff, attachments: []}]);
                    if (stuff && stuff.attachments && stuff.attachments.length) rm("./cache/messages/" + stuff.id, { recursive: true }).catch((err) => { console.log("Unable to remove sniped messages' attachments."); logger.error(err); });
                }, (err) => {
                    if (err.code === 50013) {
                        let nice = cunted === "snipe" ? client.snipe(msg.guildID, true, stuff, false) : cunted === "esnipe" || cunted === "edit snipe" ? client.esnipe(msg.guildID, true, stuff, false) : client.rsnipe(msg.guildID, true, stuff, false);
                    } else logger.error(err);
                })
            }
        }

        const args = cunted.split(" ");
        const cmd = client.messages.findIndex(v => v.command.some(c => c === args[0]));

        if (blacklist[0] === 0 && cmd !== -1) {
            const res = await client.messages[cmd].handler({ args, client, db: database, logger, msg, storage });

            if (res !== false) return;
        }

        if (snipable === 0) return;//msg.channel.id !== "293099269064359936" && msg.channel !== "293099269064359936") return;

        if (client.cache.messages.length >= 99) {
            let spliced = client.cache.messages.splice(0, 1);
            if (spliced[0].attachments.length) {//[0][11].length) {
                if (client.cache.deleted_msg.some(v => v.id !== spliced[0].id)) rm("./cache/messages/" + spliced[0].id, { recursive: true }).catch((err) => { console.log("Unable to remove spliced messages' attachments."); logger.error(err); });
            }
        }

        // 0 is ID, 1 is content if possible, 2 is username of who posted it if possible.
        let referencedMessages = [null, null, null];

        if (msg.messageReference && msg.messageReference.channelID) {
            referencedMessages[0] = msg.messageReference.messageID || -1;
            
            if (msg.referencedMessage) {
                referencedMessages[1] = msg.referencedMessage.content || null;
                referencedMessages[2] = msg.referencedMessage.author.username;
            }
        }

        // i is id, n is name
        let menList = {i: [], n: []};

        if (msg.mentions.users.length || msg.mentions.members.length) {
            for (let i = 0; i < msg.mentions.users.length; i++) {
                let menItem = msg.mentions.users[i];

                menList.i.push(menItem.id);
                menList.n.push(menItem.username);
            }

            for (let n = 0; n < msg.mentions.members.length; n++) {
                let menItem = msg.mentions.members[n];

                if (menList.i.includes(menItem.user.id)) continue;

                menList.i.push(menItem.id);
                menList.n.push(menItem.username);
            }
        }

        /**
         * @type {{id: string, url: string, filename: string, size: number, type: string}[]}
         */
        let attachments = [];
        let promises = [];

        if (msg.attachments.size > 0) {
            let dirCreated = false;
            let staph = false;
            let length = 0;

            for (let i of msg.attachments.toArray()) {
                //if (!i.contentType.includes("image")) continue;
                if (i.size > 1000*1000*8) continue;
                if (staph) continue;

                let imgURL = await request(i.url);

                if (!dirCreated) await mkdir(resolve("./cache/messages/" + msg.id + "/")).then(() => { dirCreated = true; }, (err) => { logger.error(err); staph = true; attachments = []; })

                if (!staph) promises.push(pipeline(imgURL.body, createWriteStream(resolve("./cache/messages/" + msg.id + "/" + i.id + '-' + i.filename))).then((v) => { attachments.push({id: i.id, url: i.url, filename: i.filename, size: i.size, type: i.contentType || null}); return v;}));
                length++;
            }
        }

        await Promise.allSettled(promises).then((v) => {
            // TODO: care when an attachment fails to download.
        });

        console.log("bbb");

        client.cache.messages.push({
            id: msg.id, content: EncryptionHandler.encrypt(msg.content),
            channel: {
                id: msg.channel.id, name: msg.channel.name
            }, dates: { postedAt: msg.createdAt }, user: {
                id: msg.author.id, name: msg.author.username,
                avatarURL: msg.author.avatarURL()
            }, attachments: attachments,
            reference: {
                id: referencedMessages[0],
                content: referencedMessages[1],
                userName: referencedMessages[2]
            }, mentions: menList,
            guild: {
                id: msg.guildID
            }
        });
    });

    // Fuck you ginger
    client.on("messageDelete", (msg) => {
        if (!msg.guildID) return;
        if (database.isChannelSnipable(msg.channelID, msg.guildID) === 0) return;
        let message = client.cache.messages.find(v => v.id === msg.id);
        let snipeIndex = client.cache.sniped.findIndex(v => v[0] === msg.id && v[1] === msg.channelID);

        if (client.debug) console.log(snipeIndex);

        if (snipeIndex !== -1) {
            let snipeo = client.cache.sniped.splice(snipeIndex, 1)[0];
            let userId = snipeo[2].user.id; //(snipeo[2].type !== 3) ? snipeo[2].userId : snipeo[2].user.id;

            if (client.debug) console.log(userId);
            // max, nav, meer
            if (!["254760236034949120", "346018784101793793", "381779063070785536"].includes(userId)) return;

            if (client.debug) console.log(1);

            if (snipeo[2].type === 1) client.snipe(msg.guildID, true, snipeo[2], true);
            else if (snipeo[2].type === 2) client.esnipe(msg.guildID, true, snipeo[2], true);
            else if (snipeo[2].type === 3) client.rsnipe(msg.guildID, true, snipeo[2], true);
        }

        if (message) {
            message.dates.deletedAt = Date.now();

            let parsedMsg = JSON.parse(JSON.stringify(message));
            client.cache.deleted_msg.push(parsedMsg);

            parsedMsg.content = (message.content);

            client.jsons.msg.value.deletedMsg.push(parsedMsg);
            client.jsons.msg.saveQueue();
        }
    })

    // Fuck you ginger
    client.on("messageUpdate", (msg, oldMsg) => {
        if (!msg.guildID) return;
        if (database.isChannelSnipable(msg.channelID, msg.guildID) === 0) return;
        let dong = client.cache.messages.findIndex(v => v.id === msg.id);

        if (dong !== -1) {
            let message = client.cache.messages[dong];

            if (EncryptionHandler.decrypt(message.content) === msg.content) return;

            let editedMsgSnipe = {
                id: msg.id,
                channel: {
                    id: msg.channel.id,
                    name: msg.channel.name
                }, contents: {
                    old: message.content,
                    new: msg.content
                }, dates: {
                    editedAt: msg.editedTimestamp, postedAt: message.dates.postedAt
                }, type: 2, user: {
                    id: msg.author.id, name: msg.author.username,
                    avatarURL: ((msg.author.avatar) ? msg.author.avatarURL() : msg.author.defaultAvatarURL())
                }, guild: {
                    id: msg.guildID
                }
            };

            client.cache.edited_msg.push(editedMsgSnipe);
            
            client.cache.messages[dong].content = EncryptionHandler.encrypt(msg.content);
            client.cache.messages[dong].edited = true;

            editedMsgSnipe.contents.old = (editedMsgSnipe.contents.old);
            editedMsgSnipe.contents.new = EncryptionHandler.encrypt(editedMsgSnipe.contents.new);

            client.jsons.msg.value.editedMsg.push(editedMsgSnipe);
            client.jsons.msg.saveQueue();
        }
    })
}