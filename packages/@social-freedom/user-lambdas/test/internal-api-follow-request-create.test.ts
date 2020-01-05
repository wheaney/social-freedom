import Util from "../src/shared/util";
import {internalFollowRequestCreate} from "../src/internal-api-follow-request-create";
import {
    FollowingAccountDetails,
    setupEnvironmentVariables
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

describe("internalFollowRequestCreate", () => {
    it("should queue up the outgoing request", async () => {
        await internalFollowRequestCreate('authToken', FollowingAccountDetails)

        expect(mockedUtil.addToDynamoSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'followingUserId')
        expect(mockedUtil.putTrackedAccount).toHaveBeenCalledWith(FollowingAccountDetails)
        expect(mockedUtil.queueAPIRequest).toHaveBeenCalledWith('myApiDomain.com', 'internal/async/follow-requests',
            'authToken', 'POST', FollowingAccountDetails)
    })
})