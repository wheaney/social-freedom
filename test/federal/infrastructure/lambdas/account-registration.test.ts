import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {PutItemInput} from "aws-sdk/clients/dynamodb";
import {doHandle as handler} from "../../../../src/federal/infrastructure/lambdas/account-registration"

jest.mock('uuid', () => ({
    v1: () => {
        return "someUUID"
    }
}))

beforeAll(async (done) => {
    done();
});

describe("the AccountRegistration handler", () => {
    it("should succeed when putItem succeeds", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'IdentityToAccount',
                Item: {
                    "cognitoIdentityId": {S: "cognitoIdentityId"},
                    "accountId": {S: "accountId"},
                    "region": {S: "region"},
                    "userId": {S: "someUUID"}
                }
            })

            callback(null, {});
        })

        await handler({
            cognitoIdentityId: "cognitoIdentityId",
            accountId: "accountId",
            region: "region"
        })

        AWSMock.restore('DynamoDB');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'IdentityToAccount',
                Item: {
                    "cognitoIdentityId": {S: "cognitoIdentityId"},
                    "accountId": {S: "accountId"},
                    "region": {S: "region"},
                    "userId": {S: "someUUID"}
                }
            })

            callback("failed!");
        })

        try {
            await handler({
                cognitoIdentityId: "cognitoIdentityId",
                accountId: "accountId",
                region: "region"
            })
        } catch (e) {
            expect(e).toEqual("failed!")
        }

        AWSMock.restore('DynamoDB');
    });
});