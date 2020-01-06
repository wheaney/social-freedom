import {FollowingAccountDetails, setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";
import * as Types from "@social-freedom/types"
import {internalFollowRequestRespond} from "../src/internal-api-follow-request-respond";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey,
    AccountDetailsRejectedFollowRequestsKey
} from "../src/shared/constants";
import Dynamo from "../src/services/dynamo";
import UserAPI from "../src/services/user-api";

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
            accountDetails: undefined
        })
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedDynamo.addToSet).not.toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsRejectedFollowRequestsKey, 'otherUserId')
        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
    })
});