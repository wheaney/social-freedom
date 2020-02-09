import * as uuid from "uuid";
import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {isPostDetails, Optional} from "@social-freedom/types";
import Dynamo from "./services/dynamo";
import SNS from "./services/sns";
import Helpers from "./shared/helpers";

export const handler = async (event: APIGatewayEvent) => {
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

export const putPost = async (post: any) => {
    if (isPostDetails(post)) {
        await Promise.all([
            Dynamo.client.putItem({
                TableName: process.env.POSTS_TABLE,
                Item: {
                    "key": {S: PostsTablePartitionKey},
                    "id": {S: post.id},
                    "userId": {S: post.userId},
                    "timeSortKey": {S: `${post.timestamp}-${post.id}`},
                    "timestamp": {N: `${post.timestamp}`},
                    "type": {S: post.type},
                    "body": {S: post.body},
                    "mediaUrl": Optional.of(post.mediaUrl).map(Helpers.toDynamoString).get() // TODO - validate this
                }
            }).promise(),
            SNS.client.publish({
                TopicArn: process.env.POSTS_TOPIC,
                Message: JSON.stringify({
                    id: post.id,
                    timestamp: post.timestamp,
                    type: 'Post',
                    operation: 'Create',
                    userId: process.env.USER_ID,
                    body: post
                })
            }).promise()
        ])
    }
}