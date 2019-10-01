import * as AWS from "aws-sdk"
import {AccountRegistrationEvent} from "../../../shared/account-types";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event:APIGatewayEvent) => {
    return await doHandle(event.requestContext.identity.cognitoIdentityId, JSON.parse(event.body))
};

// visible for testing
export const doHandle = async (userId: string, request:AccountRegistrationEvent) => {
    // Verify identity, region, and account ID
    // TODO

    await new AWS.DynamoDB().putItem({
        TableName: process.env.ACCOUNTS_TABLE,
        Item: {
            "userId": {S: userId},
            "accountId": {S: request.accountId},
            "region": {S: request.region}
        }
    }).promise()

    // Deploy CloudFormation template to account
    // TODO
}