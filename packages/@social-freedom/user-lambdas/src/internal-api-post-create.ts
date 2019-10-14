import * as uuid from "uuid";
import * as AWS from "aws-sdk";
import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {BasicPostDetails} from "@social-freedom/types";
import {PostsTablePartitionKey} from "./shared/constants";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        await postCreate({
            ...JSON.parse(event.body),
            userId: Util.getUserId(event)
        })
    })
};

export const postCreate = async (request:BasicPostDetails) => {
    const awsAccountId = process.env.ACCOUNT_ID
    const awsRegion = process.env.REGION
    const userId = process.env.USER_ID

    // Add post to DynamoDB "posts" table
    const timestamp:number = new Date(Date.now()).getTime()
    const id = uuid.v1()
    await new AWS.DynamoDB().putItem({
        TableName: process.env.POSTS_TABLE,
        Item: {
            "key": {S: PostsTablePartitionKey},
            "id": {S: id},
            "userId": {S: request.userId},
            "timeSortKey": {S: `${timestamp}-${id}`},
            "timestamp": {N: `${timestamp}`},
            "type": {S: request.type},
            "body": {S: request.body},
            "mediaUrl": request.mediaUrl ? {S: request.mediaUrl} : undefined // TODO - validate this
        }
    }).promise()

    // Publish to the posts SNS topic
    await new AWS.SNS().publish({
        TopicArn: `arn:aws:sns:${awsRegion}:${awsAccountId}:Posts-${userId}`,
        Message: JSON.stringify({
            default: `create ${request.type} ${request.body} ${request.mediaUrl}`,
            eventType: "create",
            id: id,
            userId: userId,
            type: request.type,
            body: request.body,
            mediaUrl: request.mediaUrl
        }),
        MessageStructure: "json"
    }).promise()

    // TODO - add this post to our own Feed
}