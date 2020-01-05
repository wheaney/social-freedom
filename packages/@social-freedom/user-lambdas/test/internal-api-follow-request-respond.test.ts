import {FollowingAccountDetails, setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";
import * as Types from "@social-freedom/types"
import {internalFollowRequestRespond} from "../src/internal-api-follow-request-respond";
import Util from "../src/shared/util";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey, AccountDetailsRejectedFollowRequestsKey
} from "../src/shared/constants";

jest.mock("@social-freedom/types")
const mockedTypes = Types as jest.Mocked<typeof Types>

jest.mock("../src/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

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

        expect(mockedUtil.queueAPIRequest.mock.calls).toMatchObject([
            ['apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
                accepted: true,
                accountDetails: ThisAccountDetails
            }],
            ['myApiDomain.com', 'internal/async/follow-requests', 'authToken', 'POST', FollowingAccountDetails]
        ])
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    });

    it('should not reciprocate if public', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            isThisAccountPublic: true
        })

        expect(mockedUtil.queueAPIRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: true,
            accountDetails: ThisAccountDetails
        })
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })

    it('should not reciprocate if already following', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            isAlreadyFollowingUser: true
        })

        expect(mockedUtil.queueAPIRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: true,
            accountDetails: ThisAccountDetails
        })
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })

    it('should track if rejected', async () => {
        await internalFollowRequestRespond({
            ...testEventValues,
            eventBody: { accepted: false, userId: 'otherUserId' }
        })
        expect(mockedUtil.queueAPIRequest).toHaveBeenCalledWith('apiDomainName', 'follower/follow-request-response', 'authToken', 'POST', {
            accepted: false,
            accountDetails: undefined
        })
        expect(mockedUtil.addToDynamoSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsRejectedFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })
});