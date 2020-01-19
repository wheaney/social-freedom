import {AttributeMap, QueryOutput} from "aws-sdk/clients/dynamodb";
import {FeedEntry, PostDetails, PostType} from "@social-freedom/types";
import TrackedAccounts from "../src/daos/tracked-accounts";
import {AWSError} from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";
import {TestAccountDetails} from "../../types/test/types/shared";
import {setupEnvironmentVariables} from "./test-utils";
import Feed from "../src/daos/feed";
import {dynamoValueToFeedEntry, feedGet} from "../src/internal-api-feed-get";

const TestPost: PostDetails = {
    id: 'postId',
    userId: 'otherUserId',
    type: PostType.Text,
    body: 'body',
    mediaUrl: 'mediaUrl',
    timestamp: 12345
}

const TestFeedEntry: FeedEntry = {
    id: 'feedId',
    userId: 'userId',
    operation: 'Create',
    timestamp: 23456,
    body: TestPost,
    type: 'Post'
}

const TestDynamoFeedEntry: AttributeMap = {
    id: {S: 'feedId'},
    userId: {S: 'userId'},
    type: {S: 'Post'},
    operation: {S: 'Create'},
    body: {S: JSON.stringify(TestPost)},
    timestamp: {N: '23456'}
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

test('dynamoValueToFeedEntry', () => {
    expect(dynamoValueToFeedEntry(TestDynamoFeedEntry)).toStrictEqual(TestFeedEntry)
})

test('feedGet', async () => {
    const mockGetEntries = jest.spyOn(Feed, 'getEntries')
    const mockTrackedAccountsGet = jest.spyOn(TrackedAccounts, 'getAll')

    mockGetEntries.mockResolvedValue({
        Items: [TestDynamoFeedEntry],
        LastEvaluatedKey: {
            timeSortKey: {S: 'timeSortKey'}
        }
    } as unknown as PromiseResult<QueryOutput, AWSError>)
    mockTrackedAccountsGet.mockResolvedValue({
        userId: TestAccountDetails
    })

    expect(await feedGet({
        cachedUsers: ['cachedUsers'],
        lastPostKey: 'lastEntryKey'
    })).toStrictEqual({
        users: { userId: TestAccountDetails },
        entries: [TestFeedEntry],
        lastEntryKey: 'timeSortKey'
    })

    expect(mockGetEntries).toHaveBeenCalledWith('lastEntryKey')
    expect(mockTrackedAccountsGet).toHaveBeenCalledWith(['userId'], ['cachedUsers'])
})