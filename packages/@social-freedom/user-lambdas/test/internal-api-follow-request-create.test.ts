import Util from "../src/shared/util";
import {internalFollowRequestCreate} from "../src/internal-api-follow-request-create";
import {
    FollowingAccountDetails,
    FollowingAccountDetailsFull,
    setupEnvironmentVariables,
    ThisAccountDetails,
    ThisAccountDetailsFull
} from "./test-utils";
import {AccountDetailsOutgoingFollowRequestsKey} from "../src/shared/constants";

jest.mock("../src/shared/util")
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

        await internalFollowRequestCreate('authToken', FollowingAccountDetailsFull)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'followingUserId')
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalledWith(FollowingAccountDetailsFull)
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('apiDomainName', '/follower/follow-request-create',
            'authToken', 'POST', ThisAccountDetails)
    })

    it("should use account details that are provided", async () => {
        await internalFollowRequestCreate('authToken', ThisAccountDetailsFull, FollowingAccountDetails)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'someUserId')
        expect(mockedUtil.putTrackedAccountDetails).toHaveBeenCalled()
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('myApiDomain.com', '/follower/follow-request-create',
            'authToken', 'POST', FollowingAccountDetails)
        expect(mockedUtil.getThisAccountDetails).not.toHaveBeenCalled()
    })
})