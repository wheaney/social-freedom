import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {PutItemInput} from "aws-sdk/clients/dynamodb";
import {handler} from "../../../../src/federal/infrastructure/lambdas/account-registration/index"

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
                    "identity": {S: "identity"},
                    "account": {S: "account"}
                }
            })

            callback(null, {});
        })

        expect(await handler({
            identity: "identity",
            account: "account"
        })).toStrictEqual({
            statusCode: 200
        });

        AWSMock.restore('DynamoDB');
    });

    it("should fail when putItem fails", async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('DynamoDB', 'putItem', (params: PutItemInput, callback: Function) => {
            expect(params).toStrictEqual({
                TableName: 'IdentityToAccount',
                Item: {
                    "identity": {S: "identity"},
                    "account": {S: "account"}
                }
            })

            callback("failed!");
        })

        try {
            await handler({
                identity: "identity",
                account: "account"
            })
        } catch (e) {
            expect(e).toEqual("failed!")
        }

        AWSMock.restore('DynamoDB');
    });
});