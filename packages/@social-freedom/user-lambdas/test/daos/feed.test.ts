import {createAWSMock, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import Dynamo from "../../src/services/dynamo";
import Feed from "../../src/daos/feed";
import {PostType} from "@social-freedom/types";
import {FeedTablePartitionKey} from "../../src/shared/constants";
import {AWSError, Response} from "aws-sdk"
import {ItemList, QueryOutput} from "aws-sdk/clients/dynamodb";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})

describe('putEntry', () => {
    it('should make a PutItem call to Dynamo', async () => {
        const putItemMock = createAWSMock(Dynamo.client, 'putItem')
        setAWSMock(putItemMock, Promise.resolve())

        await Feed.putEntry({
            body: {
                body: "body",
                id: "postId",
                mediaUrl: "mediaUrl",
                timestamp: 12345,
                type: PostType.Image,
                userId: "userId"
            },
            id: "feedId",
            operation: "Create",
            timestamp: 23456,
            type: "Post",
            userId: "userId"
        })

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'FeedTableName',
            Item: {
                "key": {S: FeedTablePartitionKey},
                "id": {S: 'feedId'},
                "timeSortKey": {S: '23456-feedId'},
                "timestamp": {N: '23456'},
                "type": {S: 'Post'},
                "operation": {S: 'Create'},
                "userId": {S: 'userId'},
                "body": {
                    S: JSON.stringify({
                        body: "body",
                        id: "postId",
                        mediaUrl: "mediaUrl",
                        timestamp: 12345,
                        type: PostType.Image,
                        userId: "userId"
                    })
                }
            }
        })
    })
})

const queryIndexMock = jest.spyOn(Dynamo, 'queryTimestampIndex')
describe('getEntries', () => {
    it('should not set startKey if lastPostKey is not provided', async () => {
        const result = {
            Items: [] as ItemList,
            $response: new Response<QueryOutput, AWSError>()
        }
        queryIndexMock.mockResolvedValue(result)

        expect(await Feed.getEntries()).toStrictEqual(result)
        expect(queryIndexMock).toHaveBeenCalledWith('FeedTableName',
            'FeedByTimestamp', FeedTablePartitionKey, undefined)
    })

    it('should set startKey if lastPostKey is provided', async () => {
        const result = {
            Items: [] as ItemList,
            $response: new Response<QueryOutput, AWSError>()
        }
        queryIndexMock.mockResolvedValue(result)

        expect(await Feed.getEntries('lastPost-Key')).toStrictEqual(result)
        expect(queryIndexMock).toHaveBeenCalledWith('FeedTableName',
            'FeedByTimestamp', FeedTablePartitionKey, {
                key: {S: FeedTablePartitionKey},
                timeSortKey: {S: 'lastPost-Key'},
                id: {S: 'Key'}
            })
    })
})