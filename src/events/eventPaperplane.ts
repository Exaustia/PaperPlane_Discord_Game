import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Interaction } from "discord.js";
import { BotEvent } from "../types";
import { cancelGame, getProgressGameByGuild, insertGame } from "../schemas/paperPlane";
import paperPlane from "../games/paperPlane";
import axios from "axios";

const event: BotEvent = {
  name: "interactionCreate",
  execute: async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "paperPlane") return;
    if (!interaction.guildId) return;
    if (!interaction.channel) return;
    try {
      const amount = Number(interaction.fields.getTextInputValue("amount"));
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
      const inscriptionEnd = new Date().getTime() + 120000;
      const newGame = await insertGame(interaction.id, interaction.guildId, startAt, amount);
      if (!newGame) {
        return interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#AE3E7E")
        .setImage("https://media.tenor.com/jHsiqrp5To8AAAAC/paper-plane.gif")
        .setTitle("PAPER AIRPLANE RACE - WARMING UP")
        .setDescription("Get ready launchers! A new paper airplane race is starting.")
        .setFooter({
          text: `Game ID: ${interaction.id} | 4% fee per game`,
          iconURL: "https://cdn.discordapp.com/attachments/1116763352211927090/1129810604262178877/Mode_Isolation.png",
        })
        .setFields([
          {
            name: "Bet Amount",
            value: `${amount} SOL`,
            inline: true,
          },
          {
            name: "End of inscriptions",
            value: `<t:${Math.floor(inscriptionEnd / 1000)}:R>`,
            inline: true,
          },
          {
            name: "Player Limit",
            value: "10",
            inline: true,
          },
          {
            name: "Race starts",
            value: `<t:${Math.floor(startAt / 1000)}:R>`,
          },
        ]);
      const buttonJoin = new ButtonBuilder().setCustomId("joinGame").setLabel("Join!").setStyle(ButtonStyle.Success);
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
          .setLabel("Bet")
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
          content: "Click on the link below to bet on the game!",
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
