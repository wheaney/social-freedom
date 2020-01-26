import * as uuid from "uuid";
import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {FeedEntry, isPostDetails} from "@social-freedom/types";
import Dynamo from "./services/dynamo";
import SNS from "./services/sns";

export const handler = async (event:APIGatewayEvent) => {
    return await APIGateway.handleEvent(async () => {
        const eventValues = await APIGateway.internalAPIIdentityCheck(event)

        await putPost({
            id: uuid.v1(),
            ...eventValues.eventBody,
            userId: eventValues.userId,
            timestamp: Date.now()
        })
    })
};

export const putPost = async (post:any) => {
    if (isPostDetails(post)) {
        // Add post to DynamoDB "posts" table
        await Dynamo.client.putItem({
            TableName: process.env.POSTS_TABLE,
            Item: {
                "key": {S: PostsTablePartitionKey},
                "id": {S: post.id},
                "userId": {S: post.userId},
                "timeSortKey": {S: `${post.timestamp}-${post.id}`},
                "timestamp": {N: `${post.timestamp}`},
                "type": {S: post.type},
                "body": {S: post.body},
                "mediaUrl": post.mediaUrl ? {S: post.mediaUrl} : undefined // TODO - validate this
            }
        }).promise()

        // Publish to the posts SNS topic
        const feedEntry: FeedEntry = {
            id: post.id,
            timestamp: post.timestamp,
            type: 'Post',
            operation: 'Create',
            userId: process.env.USER_ID,
            body: post
        }
        await SNS.client.publish({
            TopicArn: process.env.POSTS_TOPIC,
            Message: JSON.stringify(feedEntry)
        }).promise()
    }
}