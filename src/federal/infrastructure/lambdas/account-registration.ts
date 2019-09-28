import * as AWS from "aws-sdk"
import * as uuid from "uuid";
import {AccountRegistrationEvent} from "../../../shared/account-types";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event:APIGatewayEvent) => {
    return await doHandle(JSON.parse(event.body))
};

// visible for testing
export const doHandle = async (request:AccountRegistrationEvent) => {
    // Verify identity, region, and account ID
    // TODO

    // Add identity to account id mapping in DynamoDB
    await new AWS.DynamoDB().putItem({
        TableName: "IdentityToAccount",
        Item: {
            "cognitoIdentityId": {S: request.cognitoIdentityId},
            "accountId": {S: request.accountId},
            "region": {S: request.region},
            "userId": {S: uuid.v1()}
        }
    }).promise()

    // Deploy CloudFormation template to account
    // TODO
}