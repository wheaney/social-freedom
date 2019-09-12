import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {PutItemInput} from "aws-sdk/clients/dynamodb";
import {handler} from "../../../../src/user/infrastructure/lambdas/post-create/index"
import {PublishInput} from "aws-sdk/clients/sns";
import {PostType} from "../../../../src/shared/post-types";

const ExpectedPutItemParams = {
    TableName: 'Posts-someUserId',
    Item: {
        "key": {S: "Posts"},
        "id": {S: "someUUID"},
        "timeSortKey": {S: "1234567890-someUUID"},
        "timestamp": {N: "1234567890"},
        "type": {S: "Text"},
        "body": {S: "postBody"},
        "mediaUrl": {S: "postMediaUrl"}
    }
}

const ExpectedPublishParams = {
    TopicArn: "arn:aws:sns:us-west-1:12345:Posts-someUserId",
    Message: JSON.stringify({
        default: "create Text postBody postMediaUrl",
        eventType: "create",
        id: "someUUID",
        type: "Text",
        body: "postBody",
        mediaUrl: "postMediaUrl"
    }),
    MessageStructure: "json"
}

async function invokeHandler() {
    await handler({
        type: PostType.Text,
        body: "postBody",
        mediaUrl: "postMediaUrl"
    })
}

jest.mock('uuid', () => ({
    v1: () => {
        return "someUUID"
    }
}))

jest.spyOn(global.Date, 'now').mockImplementation(() => 1234567890)

beforeAll(async (done) => {
    process.env = {
        USER_ID: "someUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345"
    }
    done();
});

describe("the PostCreate handler", () => {
    it("should succeed when putItem and publish succeed", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedPutItemParams)

            callback(null, {});
        })
        AWSMock.mock('SNS', 'publish', (params: PublishInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedPublishParams)

            callback(null, {});
        })

        await invokeHandler()

        AWSMock.restore('DynamoDB');
        AWSMock.restore('SNS');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedPutItemParams)

            callback("DynamoDB failed!");
        })

        try {
            await invokeHandler()
        } catch (e) {
            expect(e).toEqual("DynamoDB failed!")
        }

        AWSMock.restore('DynamoDB');
    });

    it("should fail when publish fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedPutItemParams)

            callback(null, {});
        })
        AWSMock.mock('SNS', 'publish', (params: PublishInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedPublishParams)

            callback("SNS failed!");
        })

        try {
            await invokeHandler()
        } catch (e) {
            expect(e).toEqual("SNS failed!")
        }

        AWSMock.restore('DynamoDB');
        AWSMock.restore('SNS');
    });
});