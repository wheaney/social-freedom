import * as AWS from "aws-sdk"
import {AccountRegistrationEvent} from "../../../../shared/account-registration-types";

export const handler = async (event:AccountRegistrationEvent) => {
    // Deploy CloudFormation template to account
    // TODO

    // Add identity to account id mapping in DynamoDB
    await new AWS.DynamoDB().putItem({
        TableName: "IdentityToAccount",
        Item: {
            "identity": {S: event.identity},
            "account": {S: event.account}
        }
    }).promise()

    // Subscribe to SNS topic for profile updates
    // TODO

    // Grab initial profile data, if present
    // TODO
};