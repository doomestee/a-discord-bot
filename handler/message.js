const { existsSync: efs, readdirSync: rds } = require("fs");

module.exports = (client) => {
    rds("./commands/").forEach(dir => {

        // Checks if it is a folder. (is = continue)

        if (!efs(`./commands/${dir}/`)) return;

        for (let file of rds(`./commands/${dir}/`)) {
            let pull = require(`../commands/${dir}/${file}`);

            if (pull.handler) {
                client.messages.push(pull);//messages.//.set(pull.name, pull);
                //table.addRow(file, "✅");
            } else {
                //table.addRow(file, "❌ -> missing somethings?");
                continue;
            }
        }
    });
}