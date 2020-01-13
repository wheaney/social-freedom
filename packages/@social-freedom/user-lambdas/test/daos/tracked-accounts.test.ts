import {createAWSMock, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import Dynamo from "../../src/services/dynamo";
import TrackedAccounts from "../../src/daos/tracked-accounts";
import {AttributeMap} from "aws-sdk/clients/dynamodb";
import {ReducedAccountDetails} from "@social-freedom/types";


beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})

const TestTrackedAccount: ReducedAccountDetails = {
    postsTopicArn: 'postsTopicArn',
    profileTopicArn: 'profileTopicArn',
    name: 'name',
    apiOrigin: 'apiOrigin',
    userId: 'userId',
    photoUrl: 'photoUrl'
}
const OtherTrackedAccount: ReducedAccountDetails = {
    postsTopicArn: 'otherPostsTopicArn',
    profileTopicArn: 'otherProfileTopicArn',
    name: 'otherName',
    apiOrigin: 'otherApiOrigin',
    userId: 'otherUserId',
    photoUrl: 'otherPhotoUrl'
}
const TestTrackedAccountAttributes: AttributeMap = {
    userId: {S: 'userId'},
    apiOrigin: {S: 'apiOrigin'},
    postsTopicArn: {S: 'postsTopicArn'},
    profileTopicArn: {S: 'profileTopicArn'},
    name: {S: 'name'},
    photoUrl: {S: 'photoUrl'}
}
const OtherTrackedAccountAttributes: AttributeMap = {
    userId: {S: 'otherUserId'},
    apiOrigin: {S: 'otherApiOrigin'},
    postsTopicArn: {S: 'otherPostsTopicArn'},
    profileTopicArn: {S: 'otherProfileTopicArn'},
    name: {S: 'otherName'},
    photoUrl: {S: 'otherPhotoUrl'}
}

const putItemMock = createAWSMock(Dynamo.client, 'putItem')
describe('put', () => {
    it('should call putItem', async () => {
        setAWSMock(putItemMock, Promise.resolve())

        await TrackedAccounts.put(TestTrackedAccount)

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'TrackedAccountsTableName',
            Item: TestTrackedAccountAttributes
        })
    })

    it('should handle optional photoUrl', async () => {
        setAWSMock(putItemMock, Promise.resolve())

        await TrackedAccounts.put({
            ...TestTrackedAccount,
            photoUrl: undefined
        })

        expect(putItemMock).toHaveBeenCalledWith({
            TableName: 'TrackedAccountsTableName',
            Item: {
                ...TestTrackedAccountAttributes,
                photoUrl: undefined
            }
        })
    })
})

describe('attributeMapToTrackedAccount', () => {
    it('should translate if all fields are present', () => {
        expect(TrackedAccounts.attributeMapToTrackedAccount(TestTrackedAccountAttributes)).toStrictEqual(TestTrackedAccount)
    })

    it('should translate if optional photoUrl is not present', () => {
        expect(TrackedAccounts.attributeMapToTrackedAccount({
            ...TestTrackedAccountAttributes,
            photoUrl: undefined
        })).toStrictEqual({
            ...TestTrackedAccount,
            photoUrl: undefined
        })
    })

    it('should blow up if a required field is not present', () => {
        expect(() => TrackedAccounts.attributeMapToTrackedAccount({
            ...TestTrackedAccountAttributes,
            userId: undefined
        })).toThrow(new RegExp('Invalid ReducedAccountDetails .*'))
    })
})

const getItemMock = createAWSMock(Dynamo.client, 'getItem')
describe('get', () => {
    it('should return if tracked account is found', async () => {
        setAWSMock(getItemMock, Promise.resolve({
            Item: TestTrackedAccountAttributes
        }))

        expect(await TrackedAccounts.get('someUserId')).toStrictEqual(TestTrackedAccount)
    })

    it('should handle a missing account', async () => {
        setAWSMock(getItemMock, Promise.resolve())

        expect(await TrackedAccounts.get('someUserId')).toBeUndefined()
    })
})

const batchGetItemMock = createAWSMock(Dynamo.client, 'batchGetItem')
describe('getAll', () => {
    it('should handle optional excludeIds', async () => {
        setAWSMock(batchGetItemMock, Promise.resolve({
            Responses: {
                TrackedAccountsTableName: [TestTrackedAccountAttributes, OtherTrackedAccountAttributes]
            }
        }))

        expect(await TrackedAccounts.getAll(['userId', 'otherUserId'])).toStrictEqual({
            userId: TestTrackedAccount,
            otherUserId: OtherTrackedAccount
        })

        expect(batchGetItemMock).toHaveBeenCalledWith({
            RequestItems: {
                TrackedAccountsTableName: {
                    Keys: [
                        {
                            userId: {S: 'userId'}
                        },
                        {
                            userId: {S: 'otherUserId'}
                        }
                    ]
                }
            }
        })
    })

    it('should not request any excludeIds', async () => {
        setAWSMock(batchGetItemMock, Promise.resolve({
            Responses: {
                TrackedAccountsTableName: [TestTrackedAccountAttributes]
            }
        }))

        await TrackedAccounts.getAll(['userId', 'otherUserId'], ['userId'])

        expect(batchGetItemMock).toHaveBeenCalledWith({
            RequestItems: {
                TrackedAccountsTableName: {
                    Keys: [
                        {
                            userId: {S: 'otherUserId'}
                        }
                    ]
                }
            }
        })
    })

    it('should handle an empty result from Dynamo', async () => {
        setAWSMock(batchGetItemMock, Promise.resolve())

        expect(await TrackedAccounts.getAll(['userId', 'otherUserId'])).toStrictEqual({})
    })

    it('should not call Dynamo if filtered ids are empty', async () => {
        expect(await TrackedAccounts.getAll(['userId', 'otherUserId'], ['otherUserId', 'userId']))
            .toStrictEqual({})

        expect(batchGetItemMock).not.toHaveBeenCalled()
    })
})