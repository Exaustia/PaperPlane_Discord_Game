import { ChannelType, EmbedBuilder, GuildChannel, Interaction } from "discord.js";
import axios from "axios";
import initClient from "../utils/discordClient";
import { cancelGame, getGameById, startGame, updateProgressAndWinner } from "../schemas/paperPlane";
import sleep from "../utils/sleep";

const discordClient = initClient();

const paperPlane = async (interaction: Interaction) => {
  try {
    if (!interaction.channelId) return { error: "channel not found" };
    if (!interaction.guild) return { error: "guild not found" };

    const getChannel = await discordClient.channels.fetch(interaction.channelId);
    if (!getChannel) {
      return { error: "channel not found" };
    }
    if (getChannel.type !== ChannelType.GuildText) return { error: "channel not found" };
    const channel = (getChannel as GuildChannel).isTextBased() ? getChannel : undefined;
    if (!channel) {
      return { error: "channel not found" };
    }

    const game = await getGameById(interaction.id);
    if (!game) {
      return { error: "game not found" };
    }

    const diff = game.startAt - new Date().getTime();
    if (diff > 0) {
      channel.send({
        content: `The game will start in ${Math.floor(diff / 1000)} seconds`,
      });
      await sleep(diff);
    } else {
      return { error: "game already started" };
    }

    const refreshedGame = await getGameById(interaction.id);
    if (!refreshedGame) {
      return { error: "game not found" };
    }
    if (!refreshedGame.players || refreshedGame.players?.length === 0) {
      await cancelGame(interaction.id);
      return { error: "no players" };
    }

    await startGame(interaction.id);

    const emojis = ["green", "blue", "rouge", "grey", "jaune", "orange", "violet"].map((e) => {
      return interaction.guild?.emojis.cache.find((emoji) => emoji.name === e);
    });
    let emojies = emojis;

    const playersGame = refreshedGame.players.map((player) => {
      if (emojies.length === 0) {
        emojies = emojis;
      }
      const emoji = emojies[Math.floor(Math.random() * emojies.length)];
      emojies = emojies.filter((e) => e !== emoji);
      return {
        wallet: player.wallet,
        id: player.discordId,
        failed: false,
        position: 0,
        emoji: emoji,
      };
    });

    const launchMessage = playersGame.map((player) => `<@${player.id}>:\n${player.emoji}`).join("\n");
    const messageSent = await channel.send(launchMessage);
    const price = refreshedGame.amount;
    const nbPlayers = refreshedGame.players.length;
    const amountPrize = price * nbPlayers;
    const fee = amountPrize * 0.04;
    const amountWon = Math.round((amountPrize - fee) * 1000) / 1000;

    const maxLoop = 30;
    let i = 0;
    const interval = setInterval(async () => {
      const message = playersGame.map((player) => {
        // 1 chance sur 100 de crash
        if (i > 2 && Math.floor(Math.random() * 15) === 1) {
          player.failed = true;
        }
        if (player.failed) {
          return `<@${player.id}>:\n${"-".repeat(0 + player.position)}${player.emoji}:checkered_flag: distance: ${
            player.position
          }m\n`;
        }
        const plus = Math.floor(Math.random() * 2) + 1;
        // const plus = 2;

        player.position += plus;

        const spaceBeforePlane = player.position === 0 ? "" : "-".repeat(0 + player.position);
        if (i === maxLoop) {
          return `<@${player.id}>:\n${spaceBeforePlane}${player.emoji}:checkered_flag: distance: ${player.position}m`;
        }
        return `<@${player.id}>:\n${spaceBeforePlane}${player.emoji}`;
      });

      const messageToSend = message.join("\n");

      await messageSent.edit(messageToSend);
      if (i === maxLoop || playersGame.every((player) => player.failed)) {
        clearInterval(interval);

        const winners = playersGame.filter(
          (player) => player.position === Math.max(...playersGame.map((p) => p.position))
        );

        // if there is only one winner
        if (winners.length === 1) {
          await updateProgressAndWinner(interaction.id, JSON.stringify(winners[0]));
          const { message: endGameMsg, error, data } = await endGame(interaction.id);
          if (error) {
            await channel.send(endGameMsg);
          } else {
            const embed = await getWinnerMessage(winners[0].id, amountWon, winners[0].wallet, data);
            await channel.send({ embeds: [embed] });
          }
        } else {
          // if there is multiple winners
          // get random winner between the winners
          const winner = winners[Math.floor(Math.random() * winners.length)];
          const message = playersGame.map((player) => {
            if (player.id === winner.id) {
              player.position += 2;

              return `<@${player.id}>:\n${"-".repeat(0 + player.position + 2)}${
                player.emoji
              }:checkered_flag: distance: ${player.position}m`;
            }
            return `<@${player.id}>:\n${"-".repeat(0 + player.position)}${player.emoji}:checkered_flag: distance: ${
              player.position
            }m`;
          });
          const messageToSent = message.join("\n");
          await messageSent.edit(messageToSent);
          await updateProgressAndWinner(interaction.id, JSON.stringify(winner));
          const { message: endGameMsg, error, data } = await endGame(interaction.id);
          if (error) {
            await channel.send(endGameMsg);
          } else {
            const embed = await getWinnerMessage(winner.id, amountWon, winner.wallet, data);
            await channel.send({ embeds: [embed] });
          }
        }
      }
      i++;
    }, 1000);
    return { error: null };
  } catch (error) {
    console.log(error);
    return { error: "An error occured" };
  }
};

export default paperPlane;

async function endGame(id: string) {
  try {
    const result = await axios.post("https://yyc5mfr3kc.us-east-1.awsapprunner.com/bet/endgame", {
      headers: {
        "Content-Type": "application/json",
      },
      gameId: id,
    });

    return {
      message: result.data.message || null,
      error: result.data.error || false,
      data: result.data || null,
    };
  } catch (error) {
    return {
      message: "An error occured",
      error: true,
      data: null,
    };
  }
}

async function getWinnerMessage(winnerId: string, prize: string | number, wallet: string, transaction: string) {
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(":checkered_flag: Paper Plane Race Finished :checkered_flag:")
    .setDescription("Congratulations to <@" + winnerId + "> for winning the race ! :trophy:")
    .setFooter({
      text: "Maw Academia 2023 - 4% fee peer Race.",
      iconURL: "https://i.imgur.com/8lZ2M2F.png",
    })
    .setFields([
      {
        name: "Winning Racer",
        value: "<@" + winnerId + ">",
        inline: true,
      },
      {
        name: "Winner Prize",
        value: prize + " SOL",
        inline: true,
      },
      {
        name: "Wallet",
        value: wallet.slice(0, 3) + "..." + wallet.slice(-3),
        inline: true,
      },
      {
        name: "Transaction",
        value: "https://solscan.io/tx/" + transaction,
      },
    ]);
  return embed;
}
