import ThisAccount from "../../src/daos/this-account";
import {createAWSMock, FollowingAccountDetailsFull, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import Dynamo from "../../src/services/dynamo";
import {AccountDetailsFollowersKey, AccountDetailsFollowingKey} from "../../src/shared/constants";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})

describe("getDetails", () => {
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

const dynamoGetMock = createAWSMock(Dynamo.client, 'getItem')
describe("isPublic", () => {
    it("should return true if set", async () => {
        setAWSMock(dynamoGetMock, Promise.resolve({
            Item: {
                value: {
                    BOOL: true
                }
            }
        }))

        expect(await ThisAccount.isPublic()).toEqual(true)
    })

    it("should return false if set to false", async () => {
        setAWSMock(dynamoGetMock, Promise.resolve({
            Item: {
                value: {
                    BOOL: false
                }
            }
        }))

        expect(await ThisAccount.isPublic()).toEqual(false)
    })

    it("should return false if not present", async () => {
        setAWSMock(dynamoGetMock, Promise.resolve())

        expect(await ThisAccount.isPublic()).toEqual(false)
    })
})

const isInSetMock = jest.spyOn(Dynamo, 'isInSet')
describe('isFollowedBy', () => {
    it('should return true if is current user', async () => {
        expect(await ThisAccount.isFollowedBy('thisUserId')).toEqual(true)
        expect(isInSetMock).not.toHaveBeenCalled()
    })

    it('should return true if is in Followers set', async () => {
        isInSetMock.mockResolvedValue(true)

        expect(await ThisAccount.isFollowedBy('otherUserId')).toEqual(true)
        expect(isInSetMock).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
    })

    it('should return false if not in Followers set', async () => {
        isInSetMock.mockResolvedValue(false)

        expect(await ThisAccount.isFollowedBy('otherUserId')).toEqual(false)
        expect(isInSetMock).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowersKey, 'otherUserId')
    })
})

describe('isFollowing', () => {
    it('should return true if is current user', async () => {
        expect(await ThisAccount.isFollowing('thisUserId')).toEqual(true)
        expect(isInSetMock).not.toHaveBeenCalled()
    })

    it('should return true if is in Following set', async () => {
        isInSetMock.mockResolvedValue(true)

        expect(await ThisAccount.isFollowing('otherUserId')).toEqual(true)
        expect(isInSetMock).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowingKey, 'otherUserId')
    })

    it('should return false if not in Following set', async () => {
        isInSetMock.mockResolvedValue(false)

        expect(await ThisAccount.isFollowing('otherUserId')).toEqual(false)
        expect(isInSetMock).toHaveBeenCalledWith('AccountDetails', AccountDetailsFollowingKey, 'otherUserId')
    })
})