import {setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";
import {conditionalAutoRespond} from "../src/follower-api-follow-request-create";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIncomingFollowRequestsKey
} from "../src/shared/constants";
import Dynamo from "../src/services/dynamo";
import TrackedAccounts from "../src/daos/tracked-accounts";
import SNS from "../src/services/sns";

jest.mock("../src/services/dynamo")
const mockedDynamo = Dynamo as jest.Mocked<typeof Dynamo>

jest.mock("../src/services/sns")
const mockedSNS = SNS as jest.Mocked<typeof SNS>

jest.mock("../src/daos/tracked-accounts")
const mockedTrackedAccounts = TrackedAccounts as jest.Mocked<typeof TrackedAccounts>

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

        expect(mockedDynamo.addToSet).not.toHaveBeenCalled()
        expect(mockedTrackedAccounts.put).not.toHaveBeenCalled()
        expect(mockedSNS.subscribeToProfileEvents).not.toHaveBeenCalled()
        expect(mockedSNS.subscribeToPostEvents).not.toHaveBeenCalled()
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

        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowingKey, 'otherUserId')
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
        expect(mockedTrackedAccounts.put).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedSNS.subscribeToProfileEvents).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedSNS.subscribeToPostEvents).toHaveBeenCalledWith({ foo: 'bar' })
    });

    it('should store the incoming request if not auto-responding', async () => {
        await conditionalAutoRespond(testEventValues)

        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'otherUserId')
        expect(mockedTrackedAccounts.put).toHaveBeenCalledWith({ foo: 'bar' })
        expect(mockedSNS.subscribeToProfileEvents).toHaveBeenCalledWith({ foo: 'bar' })
    })
});