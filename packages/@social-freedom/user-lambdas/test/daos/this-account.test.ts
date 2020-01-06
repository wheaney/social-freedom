import ThisAccount from "../../src/daos/this-account";
import {FollowingAccountDetailsFull, setupEnvironmentVariables} from "../test-utils";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})

describe("the getThisAccountDetails function", () => {
    it("should return reduced account details for this account", async () => {
        const mockedGetProfile = jest.spyOn(ThisAccount, 'getProfile')
        mockedGetProfile.mockResolvedValue(FollowingAccountDetailsFull.profile)

        const thisAccountDetails = await ThisAccount.getDetails()
        expect(thisAccountDetails).toStrictEqual({
            userId: "thisUserId",
            apiOrigin: "myApiDomain.com",
            name: "Following User",
            photoUrl: "followingUserPhoto",
            postsTopicArn: "postsTopic",
            profileTopicArn: "profileTopic"
        })

        expect(mockedGetProfile).toHaveBeenCalled()
    })
})