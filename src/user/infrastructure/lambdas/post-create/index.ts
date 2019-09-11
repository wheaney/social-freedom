import * as uuid from "uuid";
import * as AWS from "aws-sdk";
import {PostCreateEvent} from "../../../../shared/post-types";
import {Context} from "aws-lambda";

const TableKey = "Posts"
export const handler = async (event:PostCreateEvent, context: Context) => {
    const arnParts:string[] = context.invokedFunctionArn.split(':')
    const awsAccountId = arnParts[4]
    const awsRegion = arnParts[3]

    // Add post to DynamoDB "posts" table
    const timestamp:number = new Date(Date.now()).getTime()
    const id = uuid.v1()
    await new AWS.DynamoDB().putItem({
        TableName: "Posts",
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
        TopicArn: `arn:aws:sns:${awsRegion}:${awsAccountId}:Posts`,
        Message: JSON.stringify({
            default: `create ${event.type} ${event.body} ${event.mediaUrl}`,
            eventType: "create",
            ...event
        }),
        MessageStructure: "json"
    }).promise()
};