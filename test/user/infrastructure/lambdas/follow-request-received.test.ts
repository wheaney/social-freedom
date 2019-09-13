import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {GetItemInput, UpdateItemInput} from "aws-sdk/clients/dynamodb";
import {handler} from "../../../../src/user/infrastructure/lambdas/follow-request-received/index"

const ExpectedGetItemParams = {
    TableName: "AccountDetails-someUserId",
    Key: {
        key: {S: 'isPublic'}
    }
}

const ExpectedUpdateItemParams = {
    TableName: "AccountDetails-someUserId",
    Key: {
        key: {S: "followRequests"}
    },
    UpdateExpression: `SET #value = list_append(if_not_exists(#value, :empty_list), :append_value)`,
    ExpressionAttributeNames: {
        '#value': 'value'
    },
    ExpressionAttributeValues: {
        ':empty_list': {L: []},
        ':append_value': {
            L: [{
                M: {
                    accountId: {S: "followingAccountId"},
                    region: {S: "followingRegion"},
                    userId: {S: "followingUserId"},
                    iamUserArn: {S: "followingUserARN"},
                    profile: {S: "{\"name\":\"Wayne Heaney\",\"photoUrl\":\"somePhotoUrl\"}"}
                }
            }]
        }
    }
}

async function invokeHandler() {
    await handler({
        accountId: "followingAccountId",
        region: "followingRegion",
        userId: "followingUserId",
        iamUserArn: "followingUserARN",
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
        ACCOUNT_ID: "12345"
    }
    done();
});

describe("the FollowRequestReceived handler", () => {
    it("should succeed when getItem and updateItem succeed", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {});
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedUpdateItemParams)

            callback(null, {});
        })

        await invokeHandler()

        AWSMock.restore('DynamoDB');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback("getItem failed!");
        })

        try {
            await invokeHandler()
        } catch (e) {
            expect(e).toEqual("getItem failed!")
        }

        AWSMock.restore('DynamoDB');
    });

    it("should fail when publish fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {});
        })
        AWSMock.mock('DynamoDB', 'updateItem', (params: UpdateItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedUpdateItemParams)

            callback("updateItem failed!");
        })

        try {
            await invokeHandler()
        } catch (e) {
            expect(e).toEqual("updateItem failed!")
        }

        AWSMock.restore('DynamoDB');
    });

    it("should auto-approve if the account is public", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'getItem', (params: GetItemInput, callback: Function) => {
            expect(params).toStrictEqual(ExpectedGetItemParams)

            callback(null, {
                Item: {
                    value: {
                        BOOL: true
                    }
                }
            });
        })

        await invokeHandler()

        AWSMock.restore('DynamoDB');
    });
});