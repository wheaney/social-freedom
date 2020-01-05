import * as uuid from "uuid";
import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {FeedEntry, PostDetails} from "@social-freedom/types";
import Util from "./shared/util";

export const handler = async (event:APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues = await APIGateway.internalAPIIdentityCheck(event)

        await putPost({
            ...eventValues.eventBody,
            userId: eventValues.userId
        })
    })
};

export const putPost = async (post:PostDetails) => {
    // Add post to DynamoDB "posts" table
    const timestamp:number = Date.now()
    post.id = post.id ?? uuid.v1()
    await Util.dynamoDbClient.putItem({
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
        userId: process.env.USER_ID,
        body: post
    }
    await Util.snsClient.publish({
        TopicArn: process.env.POSTS_TOPIC,
        Message: JSON.stringify(feedEntry)
    }).promise()
}