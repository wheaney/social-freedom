import Dynamo from "../../src/services/dynamo";
import TrackedAccounts from "../../src/daos/tracked-accounts";
import SNS from "../../src/services/sns"
import * as FollowRequests from "../../src/shared/follow-requests";
import {allowSynchronousApiRequests, setupEnvironmentVariables} from "../test-utils";
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "../../src/shared/constants";
import {TestAccountDetails} from "../../../types/test/types/shared";
import UserAPI from "../../src/services/user-api";
import {FollowRequestResponse} from "../../../types/src";
import ThisAccount from "../../src/daos/this-account";
import {ReducedAccountDetails} from "@social-freedom/types";

jest.mock("../../src/services/dynamo")
const mockedDynamo = Dynamo as jest.Mocked<typeof Dynamo>

jest.mock("../../src/daos/tracked-accounts")
const mockedTrackedAccounts = TrackedAccounts as jest.Mocked<typeof TrackedAccounts>

jest.mock("../../src/services/sns")
const mockedSNS = SNS as jest.Mocked<typeof SNS>

jest.mock("../../src/services/user-api")
const mockedUserAPI = UserAPI as jest.Mocked<typeof UserAPI>

jest.mock("../../src/daos/this-account")
const mockedThisAccount = ThisAccount as jest.Mocked<typeof ThisAccount>

beforeAll(done => {
    setupEnvironmentVariables()
    done()
})

beforeEach(done => {
    jest.restoreAllMocks()
    done()
})

describe('handleFollowRequestResponse', () => {
    it('should remove the outgoing request if rejected', async () => {
        await FollowRequests.handleFollowRequestResponse({
            accepted: false,
            accountDetails: TestAccountDetails
        })

        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'userId')
        expect(mockedDynamo.addToSet).not.toHaveBeenCalled()
        expect(mockedTrackedAccounts.put).not.toHaveBeenCalled()
        expect(mockedSNS.subscribeToPostEvents).not.toHaveBeenCalled()
        expect(mockedSNS.subscribeToProfileEvents).not.toHaveBeenCalled()
    })

    it('should track the responding account if accepted', async () => {
        await FollowRequests.handleFollowRequestResponse({
            accepted: true,
            accountDetails: TestAccountDetails
        })

        expect(mockedDynamo.removeFromSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsOutgoingFollowRequestsKey, 'userId')
        expect(mockedDynamo.addToSet).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowingKey, 'userId')
        expect(mockedTrackedAccounts.put).toHaveBeenCalledWith(TestAccountDetails)
        expect(mockedSNS.subscribeToPostEvents).toHaveBeenCalledWith(TestAccountDetails)
        expect(mockedSNS.subscribeToProfileEvents).toHaveBeenCalledWith(TestAccountDetails)
    })
})

describe('asyncFollowRequestCreate', () => {
    it('expects a valid response', async () => {
        allowSynchronousApiRequests()
        mockedThisAccount.getDetails.mockResolvedValue({} as unknown as ReducedAccountDetails)
        mockedUserAPI.request.mockResolvedValue({response: {}})
        const mockedResponseHandler = jest.spyOn(FollowRequests, 'handleFollowRequestResponse')

        try {
            await FollowRequests.asyncFollowRequestCreate('authToken', TestAccountDetails)
            fail('should have blown up')
        } catch (err) {
            expect(err.message).toMatch(new RegExp('Invalid FollowRequestCreateResponse .*'))
        }
        expect(mockedThisAccount.getDetails).toHaveBeenCalled()
        expect(mockedResponseHandler).not.toHaveBeenCalled()
    })

    it('does no follow-up if there is no auto-response', async () => {
        allowSynchronousApiRequests()
        mockedThisAccount.getDetails.mockResolvedValue({} as unknown as ReducedAccountDetails)
        mockedUserAPI.request.mockResolvedValue({})
        const mockedResponseHandler = jest.spyOn(FollowRequests, 'handleFollowRequestResponse')

        await FollowRequests.asyncFollowRequestCreate('authToken', TestAccountDetails)
        expect(mockedThisAccount.getDetails).toHaveBeenCalled()
        expect(mockedResponseHandler).not.toHaveBeenCalled()
    })

    it('handles an auto-response', async () => {
        allowSynchronousApiRequests()
        mockedThisAccount.getDetails.mockResolvedValue({} as unknown as ReducedAccountDetails)
        const response: FollowRequestResponse = {
            accepted: false,
            accountDetails: TestAccountDetails
        }
        mockedUserAPI.request.mockResolvedValue({
            response: response
        })
        const mockedResponseHandler = jest.spyOn(FollowRequests, 'handleFollowRequestResponse')

        await FollowRequests.asyncFollowRequestCreate('authToken', TestAccountDetails)
        expect(mockedThisAccount.getDetails).toHaveBeenCalled()
        expect(mockedResponseHandler).toHaveBeenCalledWith(response)
    })
})