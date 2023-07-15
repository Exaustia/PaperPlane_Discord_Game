import { ScanCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import initDynamoClient from "../utils/dynamodb";
import { Game } from "../types";
import { AttributeValue } from "aws-sdk/clients/dynamodb";

const client = initDynamoClient();

export const getProgressGameByGuild = async (id: string) => {
  const params = new ScanCommand({
    TableName: "paperPlane",
    ScanFilter: {
      inProgress: {
        ComparisonOperator: "EQ",
        AttributeValueList: [
          {
            BOOL: true,
          },
        ],
      },
      guildId: {
        ComparisonOperator: "EQ",
        AttributeValueList: [
          {
            S: id,
          },
        ],
      },
    },
  });
  const data = await client.send(params);
  if (data.Items?.length) {
    return formatGame(data.Items[0]);
  } else {
    return null;
  }
};

export const getGameById = async (id: string) => {
  const params = new ScanCommand({
    TableName: "paperPlane",
    ScanFilter: {
      id: {
        ComparisonOperator: "EQ",
        AttributeValueList: [
          {
            S: id,
          },
        ],
      },
    },
  });
  const data = await client.send(params);
  if (data.Items?.length) {
    return formatGame(data.Items[0]);
  } else {
    return null;
  }
};

export const insertGame = async (id: string, guildId: string, startAt: number, price: number) => {
  const timestampInNumber = new Date().getTime();

  const insertNewGame = new PutItemCommand({
    TableName: "paperPlane",
    Item: {
      id: {
        S: id,
      },
      guildId: {
        S: guildId,
      },
      inProgress: {
        BOOL: true,
      },
      players: {
        L: [],
      },
      winner: {
        S: "",
      },
      startAt: {
        N: startAt.toString(),
      },
      createdAt: {
        N: timestampInNumber.toString(),
      },
      amount: {
        N: price.toString(),
      },
      isStarted: {
        BOOL: false,
      },
      paid: {
        BOOL: false,
      },
      transactionId: {
        S: "",
      },
    },
  });
  const newGame = await client.send(insertNewGame);
  return newGame;
};

export const cancelGame = async (id: string) => {
  try {
    const cancelGame = new UpdateItemCommand({
      TableName: "paperPlane",
      Key: {
        id: {
          S: id,
        },
      },
      UpdateExpression: "SET inProgress = :inProgress",
      ExpressionAttributeValues: {
        ":inProgress": {
          BOOL: false,
        },
      },
    });
    const canceledGame = await client.send(cancelGame);
    return canceledGame;
  } catch (error) {
    return null;
  }
};

export const startGame = async (id: string) => {
  try {
    const startGame = new UpdateItemCommand({
      TableName: "paperPlane",
      Key: {
        id: {
          S: id,
        },
      },
      UpdateExpression: "SET isStarted = :isStarted",
      ExpressionAttributeValues: {
        ":isStarted": {
          BOOL: true,
        },
      },
    });
    const startedGame = await client.send(startGame);
    return startedGame;
  } catch (error) {
    return null;
  }
};

export const updateProgressAndWinner = async (id: string, winner: string) => {
  try {
    const updateGame = new UpdateItemCommand({
      TableName: "paperPlane",
      Key: {
        id: {
          S: id,
        },
      },
      UpdateExpression: "SET inProgress = :inProgress, winner = :winner",
      ExpressionAttributeValues: {
        ":inProgress": {
          BOOL: false,
        },
        ":winner": {
          S: winner,
        },
      },
    });
    const updatedGame = await client.send(updateGame);
    return updatedGame;
  } catch (error) {
    return null;
  }
};
const formatGame = (game: Record<string, AttributeValue>): Game => {
  const formatGame = {
    id: game.id.S as string,
    amount: Number(game.amount.N),
    inProgress: JSON.parse(String(game.inProgress.BOOL)) as boolean,
    isStarted: JSON.parse(String(game.isStarted.BOOL)) as boolean,
    startAt: Number(game.startAt.N),
    paid: JSON.parse(String(game.paid.BOOL)) as boolean,
    players:
      game.players.L && game.players.L.length > 0
        ? (game.players.L.map((player) => {
            if (player.S) {
              const p = JSON.parse(String(player.S));
              return {
                wallet: p.wallet as string,
                discordId: p.discordId as string,
              };
            }
          }) as { wallet: string; discordId: string }[])
        : null,
    winner: game.winner.S ? JSON.parse(String(game.winner.S)) : null,
  };

  return formatGame;
};
