import { Client, GatewayIntentBits, Partials } from "discord.js";

let client: Client<boolean> | null = null;

const initClient = () => {
  if (!client) {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
    client.login(process.env.TOKEN);
  }

  return client;
};

export default initClient;
