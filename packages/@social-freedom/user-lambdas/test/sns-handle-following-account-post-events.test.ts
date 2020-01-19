import ThisAccount from "../src/daos/this-account";
import TrackedAccounts from "../src/daos/tracked-accounts";
import {isValidAndRelevant} from "../src/sns-handle-following-account-post-events";
import {FeedEntry, PostType} from "@social-freedom/types";
import {TestAccountDetails} from "../../types/test/types/shared";

const mockIsFollowing = jest.spyOn(ThisAccount, 'isFollowing')
const mockTrackedAccountGet = jest.spyOn(TrackedAccounts, 'get')

const TestFeedEntry: FeedEntry = {
    userId: 'userId',
    type: "Post",
    timestamp: 12345,
    operation: "Create",
    id: 'feedId',
    body: {
        userId: 'otherUserId',
        type: PostType.Text,
        timestamp: 12345,
        id: 'postId',
        body: 'post body'
    }
}

describe('isValidAndRelevant', () => {
    it('should ignore events from accounts not being followed', async () => {
        mockIsFollowing.mockResolvedValue(false)

        expect(await isValidAndRelevant(TestFeedEntry, 'eventTopicArn')).toBe(false)

        expect(mockIsFollowing).toHaveBeenCalledWith('otherUserId')
        expect(mockTrackedAccountGet).not.toHaveBeenCalled()
    })

    it('should return false if account details are not found', async () => {
        mockIsFollowing.mockResolvedValue(true)
        mockTrackedAccountGet.mockResolvedValue(undefined)

        expect(await isValidAndRelevant(TestFeedEntry, 'eventTopicArn')).toBe(false)
    })

    it('should return false if topic ARN does not match the one from the account', async () => {
        mockIsFollowing.mockResolvedValue(true)
        mockTrackedAccountGet.mockResolvedValue(TestAccountDetails)

        expect(await isValidAndRelevant(TestFeedEntry, 'eventTopicArn')).toBe(false)
    })

    it('should return true if topic ARN does match the one from the account', async () => {
        mockIsFollowing.mockResolvedValue(true)
        mockTrackedAccountGet.mockResolvedValue(TestAccountDetails)

        expect(await isValidAndRelevant(TestFeedEntry, 'postsTopicArn')).toBe(true)
    })
})