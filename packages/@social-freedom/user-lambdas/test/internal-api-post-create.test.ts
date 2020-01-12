import {AWSError, Request} from "aws-sdk";
import {PutItemOutput} from "aws-sdk/clients/dynamodb";
import {putPost} from "../src/internal-api-post-create"
import {PublishResponse} from "aws-sdk/clients/sns";
import {createAWSMock, setAWSMock, setupEnvironmentVariables} from "./test-utils";
import {PostType} from "@social-freedom/types";
import Dynamo from "../src/services/dynamo";
import SNS from "../src/services/sns";

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
    putItemMock = createAWSMock<PutItemOutput>(Dynamo.client, 'putItem')
    publishMock = createAWSMock<PublishResponse>(SNS.client, 'publish')
    done()
});

describe("putPost", () => {
    it("should succeed when creating a new post", async () => {
        setAWSMock(putItemMock, Promise.resolve())
        setAWSMock(publishMock, Promise.resolve())

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
        setAWSMock(putItemMock, Promise.resolve())
        setAWSMock(publishMock, Promise.resolve())

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
        setAWSMock(putItemMock, Promise.reject('DynamoDB failed!'))

        try {
            await putPost(testPost)
        } catch (e) {
            expect(e).toEqual("DynamoDB failed!")
        }
    });

    it("should fail when publish fails", async () => {
        setAWSMock(putItemMock, Promise.resolve())
        setAWSMock(publishMock, Promise.reject('SNS failed!'))

        try {
            await putPost(testPost)
        } catch (e) {
            expect(e).toEqual("SNS failed!")
        }
    });
});