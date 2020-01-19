import {dynamoValueToPostDetails, postsGet} from "../src/follower-api-posts-get";
import {AttributeMap, QueryOutput} from "aws-sdk/clients/dynamodb";
import {PostDetails, PostType} from "@social-freedom/types";
import Dynamo from "../src/services/dynamo";
import TrackedAccounts from "../src/daos/tracked-accounts";
import {AWSError} from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";
import {TestAccountDetails} from "../../types/test/types/shared";
import {setupEnvironmentVariables} from "./test-utils";
import {PostsTablePartitionKey} from "../src/shared/constants";
import Helpers from "../src/shared/helpers";

const TestDynamoPost: AttributeMap = {
    id: {S: 'postId'},
    userId: {S: 'userId'},
    type: {S: 'Text'},
    body: {S: 'body'},
    mediaUrl: {S: 'mediaUrl'},
    timestamp: {N: '12345'}
}

const TestPost: PostDetails = {
    id: 'postId',
    userId: 'userId',
    type: PostType.Text,
    body: 'body',
    mediaUrl: 'mediaUrl',
    timestamp: 12345
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

describe('dynamoValueToPostDetails', () => {
    it('should handle missing mediaUrl', () => {
        expect(dynamoValueToPostDetails({
            ...TestDynamoPost,
            mediaUrl: undefined
        })).toStrictEqual({
            ...TestPost,
            mediaUrl: undefined
        })
    })

    it('should handle present mediaUrl', () => {
        expect(dynamoValueToPostDetails(TestDynamoPost)).toStrictEqual(TestPost)
    })
})

test('postsGet', async () => {
    const mockKeyTransform = jest.spyOn(Helpers, 'keyStringToDynamoDBKey')
    const mockQuery = jest.spyOn(Dynamo, 'queryTimestampIndex')
    const mockTrackedAccountsGet = jest.spyOn(TrackedAccounts, 'getAll')

    const dynamoKey = { foo: {S: 'bar' }}
    mockKeyTransform.mockReturnValue(dynamoKey)
    mockQuery.mockResolvedValue({
        Items: [TestDynamoPost],
        LastEvaluatedKey: {
            timeSortKey: {S: 'timeSortKey'}
        }
    } as unknown as PromiseResult<QueryOutput, AWSError>)
    mockTrackedAccountsGet.mockResolvedValue({
        userId: TestAccountDetails
    })

    expect(await postsGet({
        cachedUsers: ['cachedUsers'],
        lastPostKey: 'lastPostKey'
    })).toStrictEqual({
        users: { userId: TestAccountDetails },
        posts: [TestPost],
        lastPostKey: 'timeSortKey'
    })

    expect(mockKeyTransform).toHaveBeenCalledWith('lastPostKey', PostsTablePartitionKey)
    expect(mockQuery).toHaveBeenCalledWith('PostsTableName', 'PostsByTimestamp', PostsTablePartitionKey, dynamoKey)
    expect(mockTrackedAccountsGet).toHaveBeenCalledWith(['userId'], ['cachedUsers'])
})