import * as AWS from "aws-sdk";
import {AttributeValueList, GetItemOutput} from "aws-sdk/clients/dynamodb";
import {PromiseResult} from "aws-sdk/lib/request";
import {AWSError} from "aws-sdk";

const AccountDetailsTableKey = "AccountDetails"

export type FollowAcceptanceEvent = {
    requestId: string
}

export const handler = async (event:FollowAcceptanceEvent) => {
    // const awsAccountId = process.env.ACCOUNT_ID
    // const awsRegion = process.env.REGION
    const userId = process.env.USER_ID

    const followRequestsItem:PromiseResult<GetItemOutput, AWSError> = await new AWS.DynamoDB().getItem({
        TableName: `${AccountDetailsTableKey}-${userId}`,
        Key: {
            key: {S: 'followRequests'}
        }
    }).promise()

    let doAttempt:boolean = true
    while(doAttempt) {
        const followRequests: AttributeValueList = !!followRequestsItem.Item && !!followRequestsItem.Item['value'] &&
            followRequestsItem.Item['value'].L || []
        const followRequest = followRequests.find(r => {
            return r.M && r.M['id'] && r.M['id'].S === event.requestId
        }) || {}
        const requestIndex: number = followRequests.indexOf(followRequest)

        if (requestIndex !== -1) {
            // TODO - grant their IAM User entry into the IAM Group for account access

            // TODO - publish to SNS topic in requesting account

            // Remove the follow request from the list of received requests
            const version: string = !!followRequestsItem.Item && !!followRequestsItem.Item['version'] &&
                followRequestsItem.Item['value'].N || "0"

            try {
                await new AWS.DynamoDB().updateItem({
                    TableName: `${AccountDetailsTableKey}-${userId}`,
                    Key: {
                        key: {S: "followRequests"}
                    },
                    ConditionExpression: "#version = :version",
                    UpdateExpression: `REMOVE #value[:remove_index] ADD #version :version_inc`,
                    ExpressionAttributeNames: {
                        '#value': 'value',
                        '#version': 'version'
                    },
                    ExpressionAttributeValues: {
                        ':remove_index': {N: requestIndex.toString()},
                        ':version': {N: version}
                    }
                }).promise()

                doAttempt = false
            } catch (e) {
                // TODO - check the error type so we don't have an infinite retry loop
                doAttempt = true
            }
        }
    }
};