import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {followRequestCreate} from "../../../../src/user/infrastructure/lambdas/follower-api-follow-request-create"
import {AccountDetailsIncomingFollowRequestsKey} from "../../../../src/user/infrastructure/lambdas/shared/constants";
import * as InternalFollowRequestRespond
    from "../../../../src/user/infrastructure/lambdas/internal-api-follow-request-respond";
import Util from "../../../../src/user/infrastructure/lambdas/shared/util";
import {FollowingAccountDetails, setupEnvironmentVariables} from "./test-utils";

const mockedRequestRespond = jest.fn() as jest.MockedFunction<typeof InternalFollowRequestRespond.internalFollowRequestRespond>
jest.spyOn(InternalFollowRequestRespond, 'internalFollowRequestRespond').mockImplementation(mockedRequestRespond)

jest.mock("../../../../src/user/infrastructure/lambdas/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

async function invokeHandler() {
    return await followRequestCreate("authToken", FollowingAccountDetails)
}

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done();
});

beforeEach(async (done) => {
    jest.clearAllMocks()
    AWSMock.setSDKInstance(AWS);
    done()
});

afterEach(async (done) => {
    AWSMock.restore('SNS');
    done()
})

describe("the FollowRequestCreate handler", () => {
    it("should store request, subscribe to profile updates, and store initial account details", async () => {
        mockedUtil.isAccountPublic.mockResolvedValue(Promise.resolve(false))

        await invokeHandler()

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsIncomingFollowRequestsKey, 'followingUserId')
        expect(mockedUtil.subscribeToProfileUpdates).toHaveBeenCalledWith(FollowingAccountDetails)
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalledWith(FollowingAccountDetails)
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