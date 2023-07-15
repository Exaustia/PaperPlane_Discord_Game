import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { color } from "../functions";
import { BotEvent } from "../types";

module.exports = (client: Client) => {
  let eventsDir = join(__dirname, "../events");

  readdirSync(eventsDir).forEach((file) => {
    if (process.env.NODE_ENV === "production" && !file.endsWith(".js")) return;
    else if (process.env.NODE_ENV === "development" && !file.endsWith(".ts"))
      return;

    console.log(color("text", `🚀 Loading event ${color("variable", file)}`));
    let event: BotEvent = require(`${eventsDir}/${file}`).default;
    event.once
      ? client.once(event.name, (...args) => event.execute(...args))
      : client.on(event.name, (...args) => event.execute(...args));
    console.log(
      color(
        "text",
        `🌠 Successfully loaded event ${color("variable", event.name)}`
      )
    );
  });
};
