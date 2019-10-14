import {followRequestCreate} from "../src/follower-api-follow-request-create"
import {AccountDetailsIncomingFollowRequestsKey} from "../src/shared/constants";
import * as InternalFollowRequestRespond from "../src/internal-api-follow-request-respond";
import Util from "../src/shared/util";
import {FollowingAccountDetailsFull, setupEnvironmentVariables} from "./test-utils";

const mockedRequestRespond = jest.fn() as jest.MockedFunction<typeof InternalFollowRequestRespond.internalFollowRequestRespond>
jest.spyOn(InternalFollowRequestRespond, 'internalFollowRequestRespond').mockImplementation(mockedRequestRespond)

jest.mock("../src/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

async function invokeHandler() {
    return await followRequestCreate("authToken", FollowingAccountDetailsFull)
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

describe("the FollowRequestCreate handler", () => {
    it("should store request, subscribe to profile updates, and store initial account details", async () => {
        mockedUtil.isAccountPublic.mockResolvedValue(Promise.resolve(false))

        await invokeHandler()

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'followingUserId')
        expect(mockedUtil.subscribeToProfileUpdates).toHaveBeenCalledWith(FollowingAccountDetailsFull)
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalledWith(FollowingAccountDetailsFull)
        expect(mockedRequestRespond).not.toHaveBeenCalled()
    });

    it("should auto-approve if the account is public", async () => {
        mockedUtil.isAccountPublic.mockResolvedValue(Promise.resolve(true))

        await invokeHandler()

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalled()
        expect(mockedUtil.subscribeToProfileUpdates).toHaveBeenCalled()
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalled()
        expect(mockedRequestRespond).toHaveBeenCalledWith("authToken", {
            userId: "followingUserId",
            accepted: true
        })
    });
});