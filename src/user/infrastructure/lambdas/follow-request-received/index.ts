import * as AWS from "aws-sdk";
import {GetItemOutput} from "aws-sdk/clients/dynamodb";
import {PromiseResult} from "aws-sdk/lib/request";
import {AWSError} from "aws-sdk";
import {FollowDetails} from "../../../../shared/follow-request-types";

const AccountDetailsTableKey = "AccountDetails"

export const handler = async (event:FollowDetails) => {
    // const awsAccountId = process.env.ACCOUNT_ID
    // const awsRegion = process.env.REGION
    const userId = process.env.USER_ID

    const isAccountPublicItem:PromiseResult<GetItemOutput, AWSError> = await new AWS.DynamoDB().getItem({
        TableName: `${AccountDetailsTableKey}-${userId}`,
        Key: {
            key: {S: 'isPublic'}
        }
    }).promise()
    const isAccountPublic:boolean = !!isAccountPublicItem.Item && !!isAccountPublicItem.Item['value'] &&
        !!isAccountPublicItem.Item['value'].BOOL

    if (isAccountPublic) {
        // TODO auto-accept
    } else {
        // store the follow request
        await new AWS.DynamoDB().updateItem({
            TableName: `${AccountDetailsTableKey}-${userId}`,
            Key: {
                key: {S: "followRequests"}
            },
            UpdateExpression: `SET #value = list_append(if_not_exists(#value, :empty_list), :append_value)`,
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':empty_list': {L: []},
                ':append_value': {
                    L: [{
                        M: {
                            accountId: {S: event.accountId},
                            region: {S: event.region},
                            userId: {S: event.userId}
                        }
                    }]
                }
            }
        }).promise()

        // TODO notify user
    }
};