import {internalFollowRequestCreate} from "../src/internal-api-follow-request-create";
import {FollowingAccountDetails, setupEnvironmentVariables} from "./test-utils";
import {AccountDetailsOutgoingFollowRequestsKey} from "../src/shared/constants";
import Dynamo from "../src/services/dynamo";
import UserAPI from "../src/services/user-api";
import TrackedAccounts from "../src/daos/tracked-accounts";

jest.mock("../src/services/dynamo")
const mockedDynamo = Dynamo as jest.Mocked<typeof Dynamo>

jest.mock("../src/services/user-api")
const mockedUserAPI = UserAPI as jest.Mocked<typeof UserAPI>

jest.mock("../src/daos/tracked-accounts")
const mockedTrackedAccounts = TrackedAccounts as jest.Mocked<typeof TrackedAccounts>

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

        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'followingUserId')
        expect(mockedTrackedAccounts.put).toHaveBeenCalledWith(FollowingAccountDetails)
        expect(mockedUserAPI.asyncRequest).toHaveBeenCalledWith('myApiDomain.com', 'internal/async/follow-requests',
            'authToken', 'POST', FollowingAccountDetails)
    })
})