import {FollowingAccountDetails, setupEnvironmentVariables, ThisAccountDetails, ThisUserEvent} from "./test-utils";
import * as Types from "@social-freedom/types"
import {
    internalFollowRequestRespond,
    isAlreadyFollowing,
    requesterDetails,
    requestExists
} from "../src/internal-api-follow-request-respond";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey,
    AccountDetailsRejectedFollowRequestsKey
} from "../src/shared/constants";
import Dynamo from "../src/services/dynamo";
import UserAPI from "../src/services/user-api";
import TrackedAccounts from "../src/daos/tracked-accounts";
import {TestAccountDetails} from "../../types/test/types/shared";
import ThisAccount from "../src/daos/this-account";

jest.mock("../src/services/dynamo")
const mockedDynamo = Dynamo as jest.Mocked<typeof Dynamo>

jest.mock("../src/services/user-api")
const mockedUserAPI = UserAPI as jest.Mocked<typeof UserAPI>

jest.mock("@social-freedom/types")
const mockedTypes = Types as jest.Mocked<typeof Types>

const testEventValues = {
    userId: 'thisUserId',
    authToken: 'authToken',
    eventBody: { accepted: true, userId: 'otherUserId' },
    requestExists: true,
    requesterDetails: FollowingAccountDetails,
    thisAccountDetails: ThisAccountDetails,
    isThisAccountPublic: false,
    isAlreadyFollowingUser: false
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

beforeEach(async (done) => {
    jest.clearAllMocks()
    mockedTypes.isInternalFollowResponse.mockReturnValue(true)
    done()
});

afterEach(async (done) => {
    done()
})

describe("internalFollowRequestRespond", () => {
    it("should do nothing if a matching request or requester details aren't found", async () => {
        try {
            await internalFollowRequestRespond({
                ...testEventValues,
                requestExists: false
            })
        } catch (err) {
            expect(err).toStrictEqual({
                requestExists: false,
                requesterDetails: FollowingAccountDetails
            })
        }

        try {
            await internalFollowRequestRespond({
                ...testEventValues,
                requesterDetails: undefined
            })
        } catch (err) {
            expect(err).toStrictEqual({
                requestExists: true,
                requesterDetails: undefined
            })
        }
    });

    it('should reciprocate if accepting', async () => {
        await internalFollowRequestRespond(testEventValues)

        expect(mockedUserAPI.queueRequest.mock.calls).toMatchObject([
            ['apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
                accepted: true,
                accountDetails: ThisAccountDetails
            }],
            ['myApiDomain.com', 'internal/async/follow-requests', 'authToken', 'POST', FollowingAccountDetails]
        ])
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    });

    it('should not reciprocate if public', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            isThisAccountPublic: true
        })

        expect(mockedUserAPI.queueRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: true,
            accountDetails: ThisAccountDetails
        })
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })

    it('should not reciprocate if already following', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            isAlreadyFollowingUser: true
        })

        expect(mockedUserAPI.queueRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: true,
            accountDetails: ThisAccountDetails
        })
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })

    it('should track if rejected', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            eventBody: { accepted: false, userId: 'otherUserId' }
        })
        expect(mockedUserAPI.queueRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: false,
            accountDetails: ThisAccountDetails
        })
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsRejectedFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })
});

describe('all custom event handlers', () => {
    it('should blow up if the type check fails', async () => {
        mockedTypes.isInternalFollowResponse.mockImplementation(() => {throw new Error('Invalid InternalFollowResponse')})

        for (let eventFunction of [requestExists, requesterDetails, isAlreadyFollowing]) {
            try {
                await eventFunction(ThisUserEvent, {})
                fail('should blow up')
            } catch (err) {
                expect(err.message).toBe('Invalid InternalFollowResponse')
            }
        }
    })
})

const UserIdRequest = {
    userId: 'userId'
}

describe('requestExists', () => {
    it('should check for the requesting userId in IncomingFollowRequests', async () => {
        mockedDynamo.isInSet.mockResolvedValue(true)

        expect(await requestExists(ThisUserEvent, UserIdRequest)).toBe(true)

        expect(mockedDynamo.isInSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'userId')

        mockedDynamo.isInSet.mockResolvedValue(false)
        expect(await requestExists(ThisUserEvent, UserIdRequest)).toBe(false)
    })
})

describe('requesterDetails', () => {
    it('should pull the requesting user\'s details from TrackedAccounts', async () => {
        const mockedTrackedAccountGet = jest.spyOn(TrackedAccounts, 'get')
        mockedTrackedAccountGet.mockResolvedValue(TestAccountDetails)

        expect(await requesterDetails(ThisUserEvent, UserIdRequest)).toStrictEqual(TestAccountDetails)

        expect(mockedTrackedAccountGet).toHaveBeenCalledWith('userId')
    })
})

describe('isAlreadyFollowing', () => {
    it('should return the result of ThisAccount.isFollowing', async () => {
        const mockedIsFollowing = jest.spyOn(ThisAccount, 'isFollowing')
        mockedIsFollowing.mockResolvedValue(true)

        expect(await isAlreadyFollowing(ThisUserEvent, UserIdRequest)).toBe(true)

        expect(mockedIsFollowing).toHaveBeenCalledWith('userId')

        mockedIsFollowing.mockResolvedValue(false)
        expect(await isAlreadyFollowing(ThisUserEvent, UserIdRequest)).toBe(false)
    })
})