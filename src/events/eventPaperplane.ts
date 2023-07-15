import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Interaction } from "discord.js";
import { BotEvent } from "../types";
import { cancelGame, getProgressGameByGuild, insertGame } from "../schemas/paperPlane";
import paperPlane from "../games/paperPlane";
import axios from "axios";

const timeToWaitBeforeCloseInscription = 30000;

const event: BotEvent = {
  name: "interactionCreate",
  execute: async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "paperPlane") return;
    if (!interaction.guildId) return;
    if (!interaction.channel) return;
    try {
      const amount = parseInt(interaction.fields.getTextInputValue("amount"));
      if (isNaN(amount)) {
        return interaction.reply({
          content: "Please enter a valid amount",
          ephemeral: true,
        });
      }
      const progressGame = await getProgressGameByGuild(interaction.guildId);
      if (progressGame) {
        return interaction.reply({
          content: "There is already a game in progress",
          ephemeral: true,
        });
      }

      const startAt = new Date().getTime() + 180000;
      const newGame = await insertGame(interaction.id, interaction.guildId, startAt, amount);
      if (!newGame) {
        return interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setAuthor({
          name: "PAPER PLANE GAME",
          iconURL: "https://meme.mawacademia.com/maw.png",
        })
        .setFields([
          {
            name: "Bet",
            value: `${amount}SOL`,
            inline: true,
          },
          {
            name: "Start at",
            value: `${new Date(startAt).toLocaleTimeString()}`,
            inline: true,
          },
          {
            name: "Inscription's end at",
            value: `${new Date(startAt - timeToWaitBeforeCloseInscription).toLocaleTimeString()}`,
            inline: true,
          },
          {
            name: "Max players",
            value: "10",
          },
        ]);
      const buttonJoin = new ButtonBuilder().setCustomId("joinGame").setLabel("Join").setStyle(ButtonStyle.Success);
      const row = new ActionRowBuilder().addComponents(buttonJoin);

      await interaction.reply({
        embeds: [embed],
        components: [row as any],
      });

      const filter = (i: any) => i.customId === "joinGame";

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 120000,
      });

      collector.on("collect", async (i: any) => {
        // update the button join to link
        const buttonLink = new ButtonBuilder()
          .setLabel("Link")
          .setStyle(ButtonStyle.Link)
          .setURL(
            `https://bet.mawacademia.com/?gameId=${interaction.id}&discordId=${i.user.id}&username=${
              i.user.username
            }&channelId=${interaction.channelId}&profilePicture=${i.user.displayAvatarURL({
              format: "png",
              dynamic: true,
            })}`
          );

        const newRow = new ActionRowBuilder().addComponents(buttonLink);
        i.reply({
          content: "Click on the link to join the game",
          components: [newRow],
          ephemeral: true,
        });
      });

      collector.on("end", async () => {
        // update the button to disable
        const buttonJoinDisable = new ButtonBuilder()
          .setCustomId("joinGame")
          .setLabel("Join")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        const newRow = new ActionRowBuilder().addComponents(buttonJoinDisable);
        await interaction.editReply({
          components: [newRow as any],
        });

        // start the game
        const { error } = await paperPlane(interaction);
        if (error) {
          const canceled = await cancelGame(interaction.id);
          if (!canceled) {
            throw new Error("Error while canceling the game, please contact the admin. GameId: " + interaction.id);
          }
          // refund the players
          await axios.post("https://yyc5mfr3kc.us-east-1.awsapprunner.com/bet/refund", {
            headers: {
              "Content-Type": "application/json",
            },
            gameId: interaction.id,
          });
        }
      });
    } catch (error) {
      console.error(error);
      interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};

export default event;
