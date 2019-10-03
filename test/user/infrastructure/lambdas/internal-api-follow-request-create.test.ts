import Util from "../../../../src/user/infrastructure/lambdas/shared/util";
import {internalFollowRequestCreate} from "../../../../src/user/infrastructure/lambdas/internal-api-follow-request-create";
import {FollowingAccountDetails, setupEnvironmentVariables, ThisAccountDetails} from "./test-utils";
import {AccountDetailsOutgoingFollowRequestsKey} from "../../../../src/user/infrastructure/lambdas/shared/constants";

jest.mock("../../../../src/user/infrastructure/lambdas/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

beforeAll(done => {
    setupEnvironmentVariables()
    done()
})

beforeEach(done => {
    jest.clearAllMocks()
    done()
})

describe("the internal FollowRequestCreate handler", () => {
    it("should retrieve account details, if none provided", async () => {
        mockedUtil.getThisAccountDetails.mockResolvedValue(ThisAccountDetails)

        await internalFollowRequestCreate('authToken', FollowingAccountDetails)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'followingUserId')
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalledWith(FollowingAccountDetails)
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('apiDomainName', '/follower/follow-request-create',
            'authToken', 'POST', ThisAccountDetails)
    })

    it("should use account details that are provided", async () => {
        await internalFollowRequestCreate('authToken', ThisAccountDetails, FollowingAccountDetails)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'someUserId')
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalled()
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('myApiDomain.com', '/follower/follow-request-create',
            'authToken', 'POST', FollowingAccountDetails)
        expect(mockedUtil.getThisAccountDetails).not.toHaveBeenCalled()
    })
})