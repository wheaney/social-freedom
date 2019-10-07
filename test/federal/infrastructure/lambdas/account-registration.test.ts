import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {PutItemInput} from "aws-sdk/clients/dynamodb";
import {registerAccount} from "../../../../src/federal/infrastructure/lambdas/account-registration"

beforeAll(async (done) => {
    process.env = {
        ACCOUNTS_TABLE: "Accounts"
    }
    done();
});

describe("the AccountRegistration handler", () => {
    it("should succeed when putItem succeeds", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'Accounts',
                Item: {
                    "userId": {S: "userId"},
                    "accountId": {S: "accountId"},
                    "region": {S: "region"}
                }
            })

            callback(null, {});
        })

        await registerAccount("userId", {
            accountId: "accountId",
            region: "region"
        })

        AWSMock.restore('DynamoDB');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'Accounts',
                Item: {
                    "userId": {S: "userId"},
                    "accountId": {S: "accountId"},
                    "region": {S: "region"}
                }
            })

            callback("failed!");
        })

        try {
            await registerAccount("userId", {
                accountId: "accountId",
                region: "region"
            })
        } catch (e) {
            expect(e).toEqual("failed!")
        }

        AWSMock.restore('DynamoDB');
    });
});