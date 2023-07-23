import { SlashCommandBuilder, CommandInteraction, CacheType } from "discord.js";
import { SlashCommand } from "../types";

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("onevsone")
    .setDescription("Guess the right number against a friend")
    .addUserOption((option) => option.setName("user").setRequired(true)),
  execute: async (interaction) => {
    try {
      const numberToGuess = Math.floor(Math.random() * 100) + 1;
      if (!interaction || !interaction.channel) return;
      const playerOne = interaction.user;
      const playerTwo = interaction.options.getUser("user");
      if (!playerTwo) return interaction.reply("Please, select a challenger");

      interaction.reply(
        `>>> <@${playerOne.id}> launch a new challenge vs <@${playerTwo.id}> \nFind the number between **1 and 100**. The round start with <@${playerOne.id}>`
      );

      const filter = (m: any) =>
        (m.author.id === playerTwo.id && !isNaN(m.content)) || (m.author.id === playerOne.id && !isNaN(m.content));
      const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });
      let turnPlayer = playerOne.id;
      let haveWinner = false;

      collector.on("collect", async (m: any) => {
        if (m.author.id === playerOne.id) {
          if (turnPlayer === playerOne.id) {
            if (Number(m.content) > 100 || Number(m.content) < 0) return;
            if (Number(m.content) === numberToGuess) {
              interaction.channel?.send(`>>> <@${playerOne.id}> **Win the game!**`);
              haveWinner = true;
              collector.stop();
            } else {
              greatOrLess(interaction, numberToGuess, Number(m.content), playerOne, playerTwo);
            }
            turnPlayer = playerTwo.id;
          }
        } else if (m.author.id === playerTwo.id) {
          if (turnPlayer === playerTwo.id) {
            if (Number(m.content) > 100 || Number(m.content) < 0) return;
            if (Number(m.content) === numberToGuess) {
              haveWinner = true;
              interaction.channel?.send(`>>> <@${playerTwo.id}> **Win the game!**`);
              collector.stop();
            } else {
              greatOrLess(interaction, numberToGuess, Number(m.content), playerTwo, playerOne);
            }
            turnPlayer = playerOne.id;
          }
        }
      });

      collector.on("end", (collected) => {
        if (!haveWinner) {
          interaction.channel?.send(`>>> Time out! The number was **${numberToGuess}**\n`);
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
  cooldown: 10,
};

export default command;

function greatOrLess(
  interaction: CommandInteraction<CacheType>,
  numberToGuess: number,
  number: number,
  currentPlayer: any,
  nextPlayer: any
) {
  if (number < numberToGuess) {
    interaction.channel?.send(
      `>>> <@${currentPlayer.id}> The number you are looking for is **greater than ${number}**\nIt's <@${nextPlayer.id}> Turn!`
    );
  } else {
    interaction.channel?.send(
      `>>> <@${currentPlayer.id}> The number you are looking for is **less than ${number}**\nIt's <@${nextPlayer.id}> Turn!`
    );
  }
}
