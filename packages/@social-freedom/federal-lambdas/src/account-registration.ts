import * as AWS from "aws-sdk"
import {RegisterAccountRequest} from "@social-freedom/types";
import {APIGatewayEvent} from "aws-lambda";
import Util from "./shared/util";

export const handler = async (event:APIGatewayEvent) => {
    return Util.apiGatewayProxyWrapper(async () => {
        await registerAccount(Util.getUserId(event), JSON.parse(event.body))
    })
};

// visible for testing
export const registerAccount = async (userId: string, request:RegisterAccountRequest) => {
    // Verify identity, region, and account ID
    // TODO

    await new AWS.DynamoDB().putItem({
        TableName: process.env.ACCOUNTS_TABLE,
        Item: {
            "userId": {S: userId},
            "accountId": {S: request.accountId},
            "region": {S: request.region},
            "apiOrigin": {S: request.apiOrigin},
            "postsTopicArn": {S: request.postsTopicArn},
            "profileTopicArn": {S: request.profileTopicArn}
        }
    }).promise()

    // Deploy CloudFormation template to account
    // TODO
}