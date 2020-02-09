import ThisAccount from "../../src/daos/this-account";
import {createAWSMock, FollowingAccountDetailsFull, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import Dynamo from "../../src/services/dynamo";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsProfileKey
} from "../../src/shared/constants";
import SNS from "../../src/services/sns";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})

let dynamoGetMock = createAWSMock(Dynamo.client, 'getItem')
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
        mockedGetProfile.mockRestore()
    })
})

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

describe('getProfile', () => {
    it('should return undefined if profile is not set', async () => {
        setAWSMock(dynamoGetMock, Promise.resolve())

        expect(await ThisAccount.getProfile()).toBeUndefined()
    })

    it('should return the profile if set', async () => {
        setAWSMock(dynamoGetMock, Promise.resolve({
            Item: {
                value: {
                    M: {
                        name: {S: 'Testy McTesterson'}
                    }
                }
            }
        }))

        expect(await ThisAccount.getProfile()).toStrictEqual({
            name: 'Testy McTesterson',
            birthday: undefined,
            email: undefined,
            phone: undefined,
            photoUrl: undefined
        })
    })

    it('should return the profile with optional fields', async () => {
        setAWSMock(dynamoGetMock, Promise.resolve({
            Item: {
                value: {
                    M: {
                        name: {S: 'Testy McTesterson'},
                        photoUrl: {S: 'photoUrl'},
                        phone: {S: 'phone'},
                        email: {S: 'email'},
                        birthday: {S: '1/2/34'}
                    }
                }
            }
        }))

        expect(await ThisAccount.getProfile()).toStrictEqual({
            name: 'Testy McTesterson',
            birthday: new Date(2019801600000),
            email: 'email',
            phone: 'phone',
            photoUrl: 'photoUrl'
        })
    })
})

describe('putProfile', () => {
    it('should put and publish', async () => {
        const putItemMock = createAWSMock(Dynamo.client, 'putItem')
        setAWSMock(putItemMock, Promise.resolve())

        const publishMock = createAWSMock(SNS.client, 'publish')
        setAWSMock(publishMock, Promise.resolve())

        await ThisAccount.putProfile(FollowingAccountDetailsFull.profile)

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'AccountDetails',
            Item: {
                key: {S: AccountDetailsProfileKey},
                name: {S: 'Following User'},
                photoUrl: {S: 'followingUserPhoto'},
                birthday: undefined,
                email: undefined,
                phone: undefined
            }
        })

        expect(publishMock).toHaveBeenCalledWith({
            TopicArn: 'profileTopic',
            Message: '{"userId":"thisUserId","apiOrigin":"myApiDomain.com","postsTopicArn":"postsTopic",' +
                '"profileTopicArn":"profileTopic","name":"Following User","photoUrl":"followingUserPhoto"}'
        })
    })
})