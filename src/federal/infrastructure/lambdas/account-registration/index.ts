import * as AWS from "aws-sdk"
import {AWSError, DynamoDB} from "aws-sdk"
import {AccountRegistrationEvent} from "../../../../shared/account-registration-types";

export const handler = async (event:AccountRegistrationEvent) => {
    // Deploy CloudFormation template to account
    // TODO

    // Add identity to account id mapping in DynamoDB
    await new Promise((resolve, reject) => {
        const dynamodb = new AWS.DynamoDB()
        dynamodb.putItem({
            TableName: "IdentityToAccount",
            Item: {
                "identity": {S: event.identity},
                "account": {S: event.account}
            }
        }, (err:AWSError, data: DynamoDB.PutItemOutput) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })

    // Subscribe to SNS topic for profile updates
    // TODO

    // Grab initial profile data, if present
    // TODO

    return {
        statusCode: 200
    };
};