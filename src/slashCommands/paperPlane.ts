import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";

const command: SlashCommand = {
  command: new SlashCommandBuilder().setName("paperplane").setDescription("start a new game"),
  execute: async (interaction) => {
    try {
      const modal = new ModalBuilder().setCustomId("paperPlane").setTitle("Launch the game");
      const nbOfPlayer = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("What the bet?")
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

      const firstActionRow = new ActionRowBuilder().addComponents(nbOfPlayer);
      modal.addComponents(firstActionRow as any);

      return interaction.showModal(modal);
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
