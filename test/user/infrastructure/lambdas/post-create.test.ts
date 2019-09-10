import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {PutItemInput} from "aws-sdk/clients/dynamodb";
import {handler} from "../../../../src/user/infrastructure/lambdas/post-create/index"
import {PublishInput} from "aws-sdk/clients/sns";
import {PostType} from "../../../../src/shared/post-types";

jest.mock('uuid', () => ({
    v1: () => {
        return "someUUID"
    }
}))

jest.spyOn(global.Date, 'now').mockImplementation(() => 1234567890)

beforeAll(async (done) => {
    done();
});

describe("the PostCreate handler", () => {
    it("should succeed when putItem and publish succeed", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'Posts',
                Item: {
                    "key": {S: "Posts"},
                    "id": {S: "someUUID"},
                    "timeSortKey": {S: "1234567890-someUUID"},
                    "timestamp": {N: "1234567890"},
                    "type": {S: "Text"},
                    "body": {S: "postBody"},
                    "mediaUrl": {S: "postMediaUrl"}
                }
            })

            callback(null, {});
        })
        AWSMock.mock('SNS', 'publish', (params: PublishInput, callback: Function) => {
            expect(params).toStrictEqual({
                TopicArn: "arn:aws:sns:us-west-1:026810594887:topic/Posts",
                Message: JSON.stringify({
                    eventType: "create",
                    type: "Text",
                    body: "postBody",
                    mediaUrl: "postMediaUrl"
                }),
                MessageStructure: "json"
            })

            callback(null, {});
        })

        expect(await handler({
            type: PostType.Text,
            body: "postBody",
            mediaUrl: "postMediaUrl"
        })).toStrictEqual({
            statusCode: 200
        });

        AWSMock.restore('DynamoDB');
        AWSMock.restore('SNS');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'Posts',
                Item: {
                    "key": {S: "Posts"},
                    "id": {S: "someUUID"},
                    "timeSortKey": {S: "1234567890-someUUID"},
                    "timestamp": {N: "1234567890"},
                    "type": {S: "Text"},
                    "body": {S: "postBody"},
                    "mediaUrl": {S: "postMediaUrl"}
                }
            })

            callback("DynamoDB failed!");
        })

        try {
            await handler({
                type: PostType.Text,
                body: "postBody",
                mediaUrl: "postMediaUrl"
            })
        } catch (e) {
            expect(e).toEqual("DynamoDB failed!")
        }

        AWSMock.restore('DynamoDB');
        AWSMock.restore('SNS');
    });

    it("should fail when publish fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'Posts',
                Item: {
                    "key": {S: "Posts"},
                    "id": {S: "someUUID"},
                    "timeSortKey": {S: "1234567890-someUUID"},
                    "timestamp": {N: "1234567890"},
                    "type": {S: "Text"},
                    "body": {S: "postBody"},
                    "mediaUrl": {S: "postMediaUrl"}
                }
            })

            callback(null, {});
        })
        AWSMock.mock('SNS', 'publish', (params: PublishInput, callback: Function) => {
            expect(params).toStrictEqual({
                TopicArn: "arn:aws:sns:us-west-1:026810594887:topic/Posts",
                Message: JSON.stringify({
                    eventType: "create",
                    type: "Text",
                    body: "postBody",
                    mediaUrl: "postMediaUrl"
                }),
                MessageStructure: "json"
            })

            callback("SNS failed!");
        })

        try {
            await handler({
                type: PostType.Text,
                body: "postBody",
                mediaUrl: "postMediaUrl"
            })
        } catch (e) {
            expect(e).toEqual("SNS failed!")
        }

        AWSMock.restore('DynamoDB');
        AWSMock.restore('SNS');
    });
});