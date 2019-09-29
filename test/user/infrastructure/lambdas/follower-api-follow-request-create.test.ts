import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {AttributeValueList, UpdateItemInput} from "aws-sdk/clients/dynamodb";
import {followRequestCreate} from "../../../../src/user/infrastructure/lambdas/follower-api-follow-request-create"
import {AccountDetailsFollowRequestsKey} from "../../../../src/user/infrastructure/lambdas/shared/constants";
import * as InternalFollowRequestRespond from "../../../../src/user/infrastructure/lambdas/internal-api-follow-request-respond";
import * as Util from "../../../../src/user/infrastructure/lambdas/shared/util";

jest.mock('uuid', () => ({
    v1: () => {
        return "someUUID"
    }
}))
const mockedRequestRespond = jest.fn() as jest.MockedFunction<typeof InternalFollowRequestRespond.internalFollowRequestRespond>
jest.spyOn(InternalFollowRequestRespond, 'internalFollowRequestRespond').mockImplementation(mockedRequestRespond)

const mockedIsPublic = jest.fn() as jest.MockedFunction<typeof Util.isAccountPublic>
jest.spyOn(Util, 'isAccountPublic').mockImplementation(mockedIsPublic)

jest.spyOn(global.Date, 'now').mockImplementation(() => 1234567890)

const ExpectedUpdateItemParams = {
    TableName: "AccountDetails",
    Key: {
        key: {S: AccountDetailsFollowRequestsKey}
    },
    UpdateExpression: `SET #value = list_append(if_not_exists(#value, :empty_list), :append_value) ADD #version :version_inc`,
    ExpressionAttributeNames: {
        '#value': 'value',
        '#version': 'version'
    },
    ExpressionAttributeValues: {
        ':empty_list': {L: [] as AttributeValueList},
        ':append_value': {
            L: [{
                M: {
                    id: {S: "someUUID"},
                    identifiers: {
                        M: {
                            cognitoIdentityId: {S: "cognitoIdentityId"},
                            accountId: {S: "followingAccountId"},
                            region: {S: "followingRegion"},
                            userId: {S: "followingUserId"},
                            apiDomainName: {S: "apiDomainName"},
                            creationDate: {N: "1234567890"}
                        }
                    },
                    profile: {S: "{\"name\":\"Wayne Heaney\",\"photoUrl\":\"somePhotoUrl\"}"}
                }
            }]
        },
        ':version_inc': {N: "1"}
    }
}

async function invokeHandler() {
    return await followRequestCreate("authToken", {
        identifiers: {
            cognitoIdentityId: "cognitoIdentityId",
            accountId: "followingAccountId",
            region: "followingRegion",
            userId: "followingUserId",
            apiDomainName: "apiDomainName"
        },
        profile: {
            name: "Wayne Heaney",
            photoUrl: "somePhotoUrl"
        }
    })
}

beforeAll(async (done) => {
    process.env = {
        USER_ID: "someUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345",
        ACCOUNT_DETAILS_TABLE: "AccountDetails",
        API_DOMAIN_NAME: "myApiDomain.com"
    }
    done();
});

beforeEach(async (done) => {
    AWSMock.setSDKInstance(AWS);
    done()
});

afterEach(async (done) => {
    AWSMock.restore('DynamoDB');
    done()
})

describe("the FollowRequestReceived handler", () => {
    it("should succeed when getItem and updateItem succeed", async () => {
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedUpdateItemParams)

            callback(null, {});
        })
        mockedIsPublic.mockResolvedValue(Promise.resolve(false))

        await invokeHandler()

        expect(mockedRequestRespond).not.toHaveBeenCalled()
    });

    it("should auto-approve if the account is public", async () => {
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedUpdateItemParams)

            callback(null, {});
        })
        mockedIsPublic.mockResolvedValue(Promise.resolve(true))

        await invokeHandler()

        expect(mockedRequestRespond).toHaveBeenCalledWith("authToken", {
            requestId: "someUUID",
            accepted: true
        })
    });

    it("should fail when updateItem fails", async () => {
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedUpdateItemParams)

            callback("updateItem failed!");
        })

        try {
            await invokeHandler()
        } catch (e) {
            expect(e).toEqual("updateItem failed!")
        }
    });
});