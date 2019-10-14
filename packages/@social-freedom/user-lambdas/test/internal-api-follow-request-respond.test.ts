import * as InternalFollowRequestCreate
    from "../src/internal-api-follow-request-create";
import Util from "../src/shared/util";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey
} from "../src/shared/constants";
import {internalFollowRequestRespond} from "../src/internal-api-follow-request-respond";
import {FollowingAccountDetailsFull, setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";

jest.mock("../src/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

const mockedConsoleError = jest.fn()
jest.spyOn(global.console, 'error').mockImplementation(mockedConsoleError)

const mockedRequestCreate = jest.fn() as jest.MockedFunction<typeof InternalFollowRequestCreate.internalFollowRequestCreate>
jest.spyOn(InternalFollowRequestCreate, 'internalFollowRequestCreate').mockImplementation(mockedRequestCreate)

async function invokeHandler(accepted: boolean) {
    return await internalFollowRequestRespond("authToken", {
        userId: "userId",
        accepted: accepted
    })
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
});

afterEach(async (done) => {
    done()
})

describe("the internal FollowRequestRespond handler", () => {
    it("should do nothing if a matching request isn't found", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(false)

        await invokeHandler(false)

        expect(mockedConsoleError).toHaveBeenCalledWith('Received invalid InternalFollowResponse', {
            requestExists: false,
            requesterDetailsExists: false
        })
        expect(mockedUtil.apiRequest).not.toHaveBeenCalled()
    });

    it("should do nothing if a request account details aren't found", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(true)
        mockedUtil.getTrackedAccountDetails.mockResolvedValue(undefined)

        await invokeHandler(false)

        expect(mockedConsoleError).toHaveBeenCalledWith('Received invalid InternalFollowResponse', {
            requestExists: true,
            requesterDetailsExists: false
        })
        expect(mockedUtil.apiRequest).not.toHaveBeenCalled()
    });

    it("should reject and remove the follow request, if not accepted", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(true)
        mockedUtil.getTrackedAccountDetails.mockResolvedValue(FollowingAccountDetailsFull)

        await invokeHandler(false)

        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('apiDomainName', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: false
            })
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'userId')
    });

    it("should accept and remove the follow request and add a Followers entry, if accepted", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(true)
        mockedUtil.getTrackedAccountDetails.mockResolvedValue(FollowingAccountDetailsFull)
        mockedUtil.getThisAccountDetails.mockResolvedValue(ThisAccountDetails)
        mockedUtil.isAccountPublic.mockResolvedValue(true)

        await invokeHandler(true)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'userId')
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('apiDomainName', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: true,
                accountDetails: ThisAccountDetails
            })
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalled()
        expect(mockedRequestCreate).not.toHaveBeenCalled()
    });

    it("should not automatically reciprocate follow request if already followed", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(true)
        mockedUtil.getTrackedAccountDetails.mockResolvedValue(FollowingAccountDetailsFull)
        mockedUtil.getThisAccountDetails.mockResolvedValue(ThisAccountDetails)
        mockedUtil.isAccountPublic.mockResolvedValue(false)
        mockedUtil.isFollowing.mockResolvedValue(true)

        await invokeHandler(true)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalled()
        expect(mockedUtil.apiRequest).toHaveBeenCalled()
        expect(mockedUtil.isFollowing).toHaveBeenCalledWith("userId")
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalled()
        expect(mockedRequestCreate).not.toHaveBeenCalled()
    });

    it("should automatically reciprocate follow request if not a public account and not already followed", async () => {
        mockedUtil.dynamoSetContains.mockResolvedValue(true)
        mockedUtil.getTrackedAccountDetails.mockResolvedValue(FollowingAccountDetailsFull)
        mockedUtil.getThisAccountDetails.mockResolvedValue(ThisAccountDetails)
        mockedUtil.isAccountPublic.mockResolvedValue(false)
        mockedUtil.isFollowing.mockResolvedValue(false)

        await invokeHandler(true)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalled()
        expect(mockedUtil.apiRequest).toHaveBeenCalled()
        expect(mockedUtil.isFollowing).toHaveBeenCalled()
        expect(mockedUtil.removeFromDynamoSet).toHaveBeenCalled()
        expect(mockedRequestCreate).toHaveBeenCalledWith('authToken', {
            userId: 'userId',
            ...FollowingAccountDetailsFull
        }, ThisAccountDetails)
    });
});