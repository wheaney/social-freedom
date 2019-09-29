import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {AttributeMap, GetItemInput, GetItemOutput, PutItemInput, UpdateItemInput} from "aws-sdk/clients/dynamodb";
import {AccountDetailsFollowRequestsKey} from "../../../../src/user/infrastructure/lambdas/shared/constants";
import {internalFollowRequestRespond} from "../../../../src/user/infrastructure/lambdas/internal-api-follow-request-respond";
import * as Util from "../../../../src/user/infrastructure/lambdas/shared/util";

jest.mock("../../../../src/user/infrastructure/lambdas/shared/util")
const mockedUtil = Util as jest.Mocked<typeof Util>

const ExpectedGetItemParams = {
    TableName: "AccountDetails",
    Key: {
        key: {S: AccountDetailsFollowRequestsKey}
    }
}

const ExpectedMyAccountDetails = {
    identifiers: {
        cognitoIdentityId: "myIdentityId",
        userId: "someUserId",
        region: "us-west-1",
        accountId: "12345",
        apiDomainName: "myApiDomain.com"
    },
    profile: {
        name: "Wayne Heaney",
        photoUrl: "somePhotoUrl"
    }
}

function followRequestAttributeValue(requestId: string): AttributeMap {
    return {
        M: {
            id: {S: requestId},
            identifiers: {
                M: {
                    apiDomainName: {S: `${requestId}.apiDomain.com`},
                    userId: {S: `${requestId}-userId`}
                }
            },
            profile: {
                M: {
                    name: {S: `${requestId}-name`},
                    photoUrl: {S: `${requestId}-photoUrl`}
                }
            }
        }
    } as AttributeMap
}

async function invoke(accepted: boolean) {
    return await internalFollowRequestRespond("authToken", {
        requestId: "requestId",
        accepted: accepted
    })
}

beforeAll(async (done) => {
    process.env = {
        USER_ID: "someUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345",
        COGNITO_IDENTITY_ID: "myIdentityId",
        ACCOUNT_DETAILS_TABLE: "AccountDetails",
        FOLLOWERS_TABLE: "Followers",
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

describe("the internal FollowRequestRespond handler", () => {
    it("should do nothing if a matching request isn't found", async () => {
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        L: [
                            followRequestAttributeValue("unmatchedRequestId")
                        ]
                    }
                }
            } as GetItemOutput);
        })

        await invoke(false)

        expect(mockedUtil.apiRequest).not.toHaveBeenCalled()
    });

    it("should reject and remove the follow request, if not accepted", async () => {
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        L: [
                            followRequestAttributeValue("unmatchedRequestId"),
                            followRequestAttributeValue("requestId")
                        ]
                    },
                    version: {N: "10"}
                }
            } as GetItemOutput);
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toMatchObject({
                TableName: "AccountDetails",
                Key: {key: {S: AccountDetailsFollowRequestsKey}},
                ExpressionAttributeValues: {
                    ':version': {N: "10"}
                }
            })

            callback(null, {})
        })

        await invoke(false)

        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: false
            })
    });

    it("should accept and remove the follow request and add a Followers entry, if accepted", async () => {
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        L: [
                            followRequestAttributeValue("requestId")
                        ]
                    },
                    version: {N: "10"}
                }
            } as GetItemOutput);
        })
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toMatchObject({
                TableName: "Followers",
                Item: {
                    identifiers: {
                        M: {
                            apiDomainName: {S: "requestId.apiDomain.com"},
                            userId: {S: "requestId-userId"}
                        }
                    },
                    profile: {
                        M: {
                            name: {S: "requestId-name"},
                            photoUrl: {S: "requestId-photoUrl"}
                        }
                    }
                }
            })

            callback(null, {})
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            callback(null, {})
        })
        mockedUtil.isAccountPublic.mockResolvedValue(true)
        mockedUtil.getProfile.mockResolvedValue({
            name: "Wayne Heaney",
            photoUrl: "somePhotoUrl"
        })

        await invoke(true)

        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: true,
                accountDetails: ExpectedMyAccountDetails
            })
        expect(mockedUtil.apiRequest).not.toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-create',
            'authToken', 'POST', ExpectedMyAccountDetails)
    });

    it("should not automatically reciprocate follow request if already followed", async () => {
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        L: [
                            followRequestAttributeValue("requestId")
                        ]
                    },
                    version: {N: "10"}
                }
            } as GetItemOutput);
        })
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            callback(null, {})
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            callback(null, {})
        })
        mockedUtil.isAccountPublic.mockResolvedValue(false)
        mockedUtil.isFollowing.mockResolvedValue(true)
        mockedUtil.getProfile.mockResolvedValue({
            name: "Wayne Heaney",
            photoUrl: "somePhotoUrl"
        })

        await invoke(true)

        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: true,
                accountDetails: ExpectedMyAccountDetails
            })
        expect(mockedUtil.isFollowing).toHaveBeenCalledWith("requestId-userId")
        expect(mockedUtil.apiRequest).not.toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-create',
            'authToken', 'POST', ExpectedMyAccountDetails)
    });

    it("should automatically reciprocate follow request if not a public account and not already followed", async () => {
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        L: [
                            followRequestAttributeValue("requestId")
                        ]
                    },
                    version: {N: "10"}
                }
            } as GetItemOutput);
        })
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            callback(null, {})
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            callback(null, {})
        })
        mockedUtil.isAccountPublic.mockResolvedValue(false)
        mockedUtil.isFollowing.mockResolvedValue(false)
        mockedUtil.getProfile.mockResolvedValue({
            name: "Wayne Heaney",
            photoUrl: "somePhotoUrl"
        })

        await invoke(true)

        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-response',
            'authToken', 'POST', {
                accepted: true,
                accountDetails: ExpectedMyAccountDetails
            })
        expect(mockedUtil.isFollowing).toHaveBeenCalledWith("requestId-userId")
        expect(mockedUtil.apiRequest).toHaveBeenCalledWith('requestId.apiDomain.com', '/follower/follow-request-create',
            'authToken', 'POST', ExpectedMyAccountDetails)
    });

    // TODO - test ConditionalCheckFailedException retry case
});