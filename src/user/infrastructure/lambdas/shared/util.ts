import {PromiseResult} from "aws-sdk/lib/request";
import {GetItemOutput, Key} from "aws-sdk/clients/dynamodb";
import * as AWS from "aws-sdk";
import {AWSError} from "aws-sdk";
import {APIGatewayEvent} from "aws-lambda";
import * as http from "http";
import {AccountDetails, Profile} from "../../../../shared/account-types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIsPublicKey,
    AuthTokenHeaderName
} from "./constants";

// TODO - unit testing

const Util = {
    apiGatewayProxyWrapper: async (proxyFunction: () => Promise<any>) => {
        try {
            return Util.apiGatewayLambdaResponse(200, await proxyFunction())
        } catch (err) {
            console.error(err)
            return Util.apiGatewayLambdaResponse(500)
        }
    },

    internalAPIIdentityCheck: (event: APIGatewayEvent): void => {
        if (process.env.USER_ID !== Util.getUserId(event)) {
            throw new Error(`Unauthorized userId: ${Util.getUserId(event)}`)
        }
    },

    followerAPIIdentityCheck: async (event: APIGatewayEvent): Promise<void> => {
        if (!await Util.isFollower(Util.getUserId(event)) &&
                process.env.USER_ID !== Util.getUserId(event)) {
            throw new Error(`Unauthorized userId: ${Util.getUserId(event)}`)
        }
    },

    apiGatewayLambdaResponse: (httpStatus: number = 200, responseBody?: any) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN
            }
        }
    },

    isAccountPublic: async (): Promise<boolean> => {
        const isAccountPublicItem: PromiseResult<GetItemOutput, AWSError> = await new AWS.DynamoDB().getItem({
            TableName: process.env.ACCOUNT_DETAILS_TABLE,
            Key: {
                key: {S: AccountDetailsIsPublicKey}
            }
        }).promise()

        return !!isAccountPublicItem.Item && !!isAccountPublicItem.Item['value'] &&
            !!isAccountPublicItem.Item['value'].BOOL
    },

    getProfile: async (): Promise<Profile> => {
        // TODO

        return {} as Profile
    },

    isFollower: async (userId: string): Promise<boolean> => {
        return await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, userId)
    },

    isFollowing: async (userId: string): Promise<boolean> => {
        return await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, userId)
    },

    apiRequest: async (hostname: string, path: string, authToken: string,
                                     requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                                     requestBody?: any) => {
        const requestBodyString: string = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody)
        const additionalRequestHeaders = requestBodyString && {
            'Content-Type': 'application/json',
            'Content-Length': requestBodyString.length
        }
        const req = http.request({
            hostname: hostname,
            path: `/prod${path}`,
            method: requestMethod,
            headers: {
                Authorization: authToken,
                ...additionalRequestHeaders
            }
        }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                throw new Error('statusCode=' + res.statusCode)
            }
            let body: any[] = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            });
            res.on('end', function () {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                } catch (e) {
                    throw e
                }
                return body
            });
        });
        req.on('error', function (err) {
            throw err
        });
        if (requestBodyString) {
            req.write(requestBodyString);
        }
        req.end();
    },

    getTrackedAccountDetails: async (userId: string): Promise<AccountDetails> => {
        const requesterDetailsItem = (await new AWS.DynamoDB().getItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Key: {
                userId: {S: userId}
            }
        }).promise()).Item

        if (!!requesterDetailsItem) {
            return {
                identifiers: {
                    accountId: requesterDetailsItem["identifiers"].M["accountId"].S,
                    region: requesterDetailsItem["identifiers"].M["region"].S,
                    apiDomainName: requesterDetailsItem["identifiers"].M["apiDomainName"].S,
                },
                profile: JSON.parse(requesterDetailsItem["profile"].S)
            }
        } else {
            return undefined
        }
    },

    addToDynamoSet: async (tableName: string, attributeKey: string, value: string) => {
        return await new AWS.DynamoDB().updateItem({
            TableName: tableName,
            Key: {
                key: {S: attributeKey}
            },
            UpdateExpression: 'ADD #value :add_value',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':add_value': {SS: [value]}
            }
        }).promise()
    },

    removeFromDynamoSet: async (tableName: string, attributeKey: string, value: string) => {
        return await new AWS.DynamoDB().updateItem({
            TableName: tableName,
            Key: {
                key: {S: attributeKey}
            },
            UpdateExpression: 'DELETE #value :delete_value',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':delete_value': {SS: [value]}
            }
        }).promise()
    },

    dynamoSetContains: async (tableName: string, attributeKey: string, value: string): Promise<boolean> => {
        const setResult = await new AWS.DynamoDB().getItem({
            TableName: tableName,
            Key: {
                key: {S: attributeKey}
            }
        }).promise()

        return !!setResult.Item && !!setResult.Item["value"] && !!setResult.Item["value"].SS
            && setResult.Item["value"].SS.includes(value)
    },

    getAuthToken: (event: APIGatewayEvent) => {
        return event.headers[AuthTokenHeaderName]
    },

    getUserId: (event: APIGatewayEvent) => {
        return event.requestContext.authorizer.claims.sub
    },

    getThisAccountDetails: async (): Promise<AccountDetails> => {
        return {
            userId: process.env.USER_ID,
            identifiers: {
                accountId: process.env.ACCOUNT_ID,
                region: process.env.REGION,
                apiDomainName: process.env.API_DOMAIN_NAME
            },
            profile: await Util.getProfile()
        }
    },

    putTrackedAccountDetails: async (accountDetails: AccountDetails) => {
        await new AWS.DynamoDB().putItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Item: {
                userId: {S: accountDetails.userId},
                identifiers: {
                    M: {
                        accountId: {S: accountDetails.identifiers.accountId},
                        region: {S: accountDetails.identifiers.region},
                        apiDomainName: {S: accountDetails.identifiers.apiDomainName},
                    }
                },
                profile: {S: JSON.stringify(accountDetails.profile)}
            }
        }).promise()
    },

    subscribeToProfileUpdates: async (account: AccountDetails) => {
        return await new AWS.SNS().subscribe({
            TopicArn: `arn:aws:sns:${account.identifiers.region}:${account.identifiers.accountId}:ProfileUpdates-${account.userId}`,
            Endpoint: process.env.PROFILE_UPDATE_HANDLER,
            Protocol: 'lambda'
        }).promise()
    },

    queryTimestampIndex: async (tableName: string, indexName: string, partitionKey: string, startKey?: Key) => {
        return await new AWS.DynamoDB().query({
            TableName: tableName,
            IndexName: indexName,
            Limit: 5,
            ScanIndexForward: false,
            KeyConditionExpression: "#key = :key",
            ExpressionAttributeNames: {
                "#key": "key"
            },
            ExpressionAttributeValues: {
                ":key": {S: partitionKey}
            },
            ExclusiveStartKey: startKey
        }).promise()
    }
}

export default Util