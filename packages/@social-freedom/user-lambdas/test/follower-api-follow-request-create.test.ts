import Util from "../src/shared/util";
import {setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";
import {conditionalAutoRespond} from "../src/follower-api-follow-request-create";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIncomingFollowRequestsKey
} from "../src/shared/constants";

jest.mock("../src/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

const testEventValues = {
    userId: "otherUserId",
    authToken: "authToken",
    eventBody: { foo: 'bar' },
    isAccountPublic: false,
    isFollowing: false,
    thisAccountDetails: ThisAccountDetails,
    hasPreviouslyRejectedRequest: false
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
});

describe("conditionalAutoRespond", () => {
    it("should auto-reject if this request was previously rejected", async () => {
        expect(await conditionalAutoRespond({
            ...testEventValues,
            hasPreviouslyRejectedRequest: true
        })).toStrictEqual({
            response: {
                accepted: false
            }
        })

        expect(mockedUtil.addToDynamoSet).not.toHaveBeenCalled()
        expect(mockedUtil.putTrackedAccount).not.toHaveBeenCalled()
        expect(mockedUtil.subscribeToProfileEvents).not.toHaveBeenCalled()
        expect(mockedUtil.subscribeToPostEvents).not.toHaveBeenCalled()
    });

    it("should auto-accept if the account is public or already following", async () => {
        const acceptResponse = {
            response: {
                accepted: true,
                accountDetails: ThisAccountDetails
            }
        }

        expect(await conditionalAutoRespond({
            ...testEventValues,
            isAccountPublic: true
        })).toStrictEqual(acceptResponse)
        expect(await conditionalAutoRespond({
            ...testEventValues,
            isFollowing: true
        })).toStrictEqual(acceptResponse)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowingKey, 'otherUserId')
        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedUtil.putTrackedAccount).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedUtil.subscribeToProfileEvents).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedUtil.subscribeToPostEvents).toHaveBeenCalledWith({ foo: 'bar' })
    });

    it('should store the incoming request if not auto-responding', async () => {
        await conditionalAutoRespond(testEventValues)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
        expect(mockedUtil.putTrackedAccount).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedUtil.subscribeToProfileEvents).toHaveBeenCalledWith({ foo: 'bar' })
    })
});