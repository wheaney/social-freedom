import {AWSError, Request} from "aws-sdk";
import {PutItemOutput} from "aws-sdk/clients/dynamodb";
import {putPost} from "../src/internal-api-post-create"
import {PublishResponse} from "aws-sdk/clients/sns";
import {setupEnvironmentVariables} from "./test-utils";
import {PostType} from "@social-freedom/types";
import Util from "../src/shared/util";
import {PromiseResult} from "aws-sdk/lib/request";

const testPost = {
    id: "id",
    timestamp: 67890,
    userId: "thisUserId",
    type: PostType.Text,
    body: "postBody",
    mediaUrl: "postMediaUrl"
}

jest.mock('uuid', () => ({
    v1: () => {
        return "someUUID"
    }
}))

jest.spyOn(global.Date, 'now').mockImplementation(() => 1234567890)

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

let putItemMock: jest.SpyInstance<Request<PutItemOutput, AWSError>>;
let publishMock: jest.SpyInstance<Request<PublishResponse, AWSError>>;
beforeEach(async (done) => {
    jest.clearAllMocks()
    putItemMock = jest.spyOn(Util.dynamoDbClient, 'putItem')

    publishMock = jest.spyOn(Util.snsClient, 'publish')
    done()
});

function mockPutItemPromise(promise: Promise<any>) {
    putItemMock.mockReturnValue({
        promise: () => promise as unknown as Promise<PromiseResult<PutItemOutput, AWSError>>
    } as unknown as Request<PutItemOutput, AWSError>)
}

function mockPublishPromise(promise: Promise<any>) {
    publishMock.mockReturnValue({
        promise: () => promise as unknown as Promise<PromiseResult<PublishResponse, AWSError>>
    } as unknown as Request<PublishResponse, AWSError>)
}

describe("putPost", () => {
    it("should succeed when creating a new post", async () => {
        mockPutItemPromise(Promise.resolve())
        mockPublishPromise(Promise.resolve())

        await putPost({
            ...testPost,
            id: undefined
        })

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'PostsTableName',
            Item: {
                "key": {S: "Posts"},
                "id": {S: "someUUID"},
                "userId": {S: "thisUserId"},
                "timeSortKey": {S: "1234567890-someUUID"},
                "timestamp": {N: "1234567890"},
                "type": {S: "Text"},
                "body": {S: "postBody"},
                "mediaUrl": {S: "postMediaUrl"}
            }
        })
        expect(publishMock).toHaveBeenCalledWith({
            TopicArn: "postsTopic",
            Message: JSON.stringify({
                id: "someUUID",
                timestamp: 1234567890,
                type: 'Post',
                operation: 'Create',
                userId: process.env.USER_ID,
                body: {
                    ...testPost,
                    id: "someUUID"
                }
            })
        })
    });

    it("should succeed when updating a post", async () => {
        mockPutItemPromise(Promise.resolve())
        mockPublishPromise(Promise.resolve())

        await putPost(testPost)

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'PostsTableName',
            Item: {
                "key": {S: "Posts"},
                "id": {S: "id"},
                "userId": {S: "thisUserId"},
                "timeSortKey": {S: "1234567890-id"},
                "timestamp": {N: "1234567890"},
                "type": {S: "Text"},
                "body": {S: "postBody"},
                "mediaUrl": {S: "postMediaUrl"}
            }
        })
        expect(publishMock).toHaveBeenCalledWith({
            TopicArn: "postsTopic",
            Message: JSON.stringify({
                id: "id",
                timestamp: 1234567890,
                type: 'Post',
                operation: 'Create',
                userId: process.env.USER_ID,
                body: testPost
            })
        })
    });

    it("should fail when putItem fails", async () => {
        mockPutItemPromise(Promise.reject('DynamoDB failed!'))

        try {
            await putPost(testPost)
        } catch (e) {
            expect(e).toEqual("DynamoDB failed!")
        }
    });

    it("should fail when publish fails", async () => {
        mockPutItemPromise(Promise.resolve())
        mockPublishPromise(Promise.reject('SNS failed!'))

        try {
            await putPost(testPost)
        } catch (e) {
            expect(e).toEqual("SNS failed!")
        }
    });
});