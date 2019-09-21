import * as uuid from "uuid";
import * as AWS from "aws-sdk";
import {PostCreateEvent} from "../../../../../shared/post-types";

const TableKey = "Posts"
export const handler = async (event:PostCreateEvent) => {
    const awsAccountId = process.env.ACCOUNT_ID
    const awsRegion = process.env.REGION
    const userId = process.env.USER_ID

    // Add post to DynamoDB "posts" table
    const timestamp:number = new Date(Date.now()).getTime()
    const id = uuid.v1()
    await new AWS.DynamoDB().putItem({
        TableName: `Posts-${userId}`,
        Item: {
            "key": {S: TableKey},
            "id": {S: id},
            "timeSortKey": {S: `${timestamp}-${id}`},
            "timestamp": {N: `${timestamp}`},
            "type": {S: event.type},
            "body": {S: event.body},
            "mediaUrl": {S: event.mediaUrl} // TODO - validate this
        }
    }).promise()

    // Publish to the posts SNS topic
    await new AWS.SNS().publish({
        TopicArn: `arn:aws:sns:${awsRegion}:${awsAccountId}:Posts-${userId}`,
        Message: JSON.stringify({
            default: `create ${event.type} ${event.body} ${event.mediaUrl}`,
            eventType: "create",
            id: id,
            type: event.type,
            body: event.body,
            mediaUrl: event.mediaUrl
        }),
        MessageStructure: "json"
    }).promise()
};