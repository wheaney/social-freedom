import * as AWS from "aws-sdk"
import {AccountRegistrationEvent} from "../../../../shared/account-registration-types";
import * as uuid from "uuid";

export const handler = async (event:AccountRegistrationEvent) => {
    // Verify identity, region, and account ID
    // TODO

    // Add identity to account id mapping in DynamoDB
    await new AWS.DynamoDB().putItem({
        TableName: "IdentityToAccount",
        Item: {
            "identity": {S: event.identity},
            "accountId": {S: event.accountId},
            "region": {S: event.region},
            "userId": {S: uuid.v1()}
        }
    }).promise()

    // Deploy CloudFormation template to account
    // TODO
};