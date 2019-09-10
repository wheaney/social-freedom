import * as uuid from "uuid";
import * as AWS from "aws-sdk";
import {AWSError, SNS, DynamoDB} from "aws-sdk";
import {PostCreateEvent} from "../../../../shared/post-types";

const TableKey = "Posts"
export const handler = async (event:PostCreateEvent) => {
    // Add post to DynamoDB "posts" table
    await new Promise((resolve, reject) => {
        const timestamp:number = new Date(Date.now()).getTime()
        const id = uuid.v1()
        const dynamodb = new AWS.DynamoDB()
        dynamodb.putItem({
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
        }, (err:AWSError, data: DynamoDB.PutItemOutput) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })

    // Publish to the posts SNS topic
    // TODO - use real region and account ID
    await new Promise((resolve, reject) => {
        const sns = new AWS.SNS()
        sns.publish({
            TopicArn: "arn:aws:sns:us-west-1:026810594887:topic/Posts",
            Message: JSON.stringify({
                eventType: "create",
                ...event
            }),
            MessageStructure: "json"
        }, (err:AWSError, data: SNS.PublishResponse) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    });

    return {
        statusCode: 200
    };
};