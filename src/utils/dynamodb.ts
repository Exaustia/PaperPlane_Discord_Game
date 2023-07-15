import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

let dynamoClient: DynamoDBClient | null = null;

const initDynamoClient = () => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return dynamoClient;
};

export default initDynamoClient;
