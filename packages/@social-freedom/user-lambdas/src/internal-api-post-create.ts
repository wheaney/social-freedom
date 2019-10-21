import * as uuid from "uuid";
import * as AWS from "aws-sdk";
import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {FeedEntry, PostDetails} from "@social-freedom/types";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        await putPost({
            ...JSON.parse(event.body),
            userId: Util.getUserId(event)
        })
    })
};

export const putPost = async (post:PostDetails) => {
    const awsAccountId = process.env.ACCOUNT_ID
    const awsRegion = process.env.REGION
    const userId = process.env.USER_ID

    // Add post to DynamoDB "posts" table
    const timestamp:number = new Date(Date.now()).getTime()
    post.id = post.id || uuid.v1()
    await new AWS.DynamoDB().putItem({
        TableName: process.env.POSTS_TABLE,
        Item: {
            "key": {S: PostsTablePartitionKey},
            "id": {S: post.id},
            "userId": {S: post.userId},
            "timeSortKey": {S: `${timestamp}-${post.id}`},
            "timestamp": {N: `${timestamp}`},
            "type": {S: post.type},
            "body": {S: post.body},
            "mediaUrl": post.mediaUrl ? {S: post.mediaUrl} : undefined // TODO - validate this
        }
    }).promise()

    // Publish to the posts SNS topic
    const feedEntry: FeedEntry = {
        id: post.id,
        timestamp: timestamp,
        type: 'Post',
        operation: 'Create',
        userId: userId,
        body: post
    }
    await new AWS.SNS().publish({
        TopicArn: `arn:aws:sns:${awsRegion}:${awsAccountId}:Posts-${userId}`,
        Message: JSON.stringify(feedEntry)
    }).promise()
}