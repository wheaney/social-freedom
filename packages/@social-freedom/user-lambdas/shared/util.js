"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const http = require("http");
const constants_1 = require("./constants");
// TODO - unit testing
const Util = {
    apiGatewayProxyWrapper: (proxyFunction) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            return Util.apiGatewayLambdaResponse(200, yield proxyFunction());
        }
        catch (err) {
            console.error(err);
            return Util.apiGatewayLambdaResponse(500);
        }
    }),
    internalAPIIdentityCheck: (event) => {
        if (process.env.USER_ID !== Util.getUserId(event)) {
            throw new Error(`Unauthorized userId: ${Util.getUserId(event)}`);
        }
    },
    followerAPIIdentityCheck: (event) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(yield Util.isFollower(Util.getUserId(event))) &&
            process.env.USER_ID !== Util.getUserId(event)) {
            throw new Error(`Unauthorized userId: ${Util.getUserId(event)}`);
        }
    }),
    apiGatewayLambdaResponse: (httpStatus = 200, responseBody) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN
            }
        };
    },
    isAccountPublic: () => __awaiter(void 0, void 0, void 0, function* () {
        const isAccountPublicItem = yield new AWS.DynamoDB().getItem({
            TableName: process.env.ACCOUNT_DETAILS_TABLE,
            Key: {
                key: { S: constants_1.AccountDetailsIsPublicKey }
            }
        }).promise();
        return !!isAccountPublicItem.Item && !!isAccountPublicItem.Item['value'] &&
            !!isAccountPublicItem.Item['value'].BOOL;
    }),
    getProfile: () => __awaiter(void 0, void 0, void 0, function* () {
        // TODO
        return {};
    }),
    isFollower: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, constants_1.AccountDetailsFollowersKey, userId);
    }),
    isFollowing: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, constants_1.AccountDetailsFollowingKey, userId);
    }),
    apiRequest: (hostname, path, authToken, requestMethod, requestBody) => __awaiter(void 0, void 0, void 0, function* () {
        const requestBodyString = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody);
        const additionalRequestHeaders = requestBodyString && {
            'Content-Type': 'application/json',
            'Content-Length': requestBodyString.length
        };
        const req = http.request({
            hostname: hostname,
            path: `/prod${path}`,
            method: requestMethod,
            headers: Object.assign({ [constants_1.AuthTokenHeaderName]: authToken }, additionalRequestHeaders)
        }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                throw new Error('statusCode=' + res.statusCode);
            }
            let body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            });
            res.on('end', function () {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                }
                catch (e) {
                    throw e;
                }
                return body;
            });
        });
        req.on('error', function (err) {
            throw err;
        });
        if (requestBodyString) {
            req.write(requestBodyString);
        }
        req.end();
    }),
    getTrackedAccountDetails: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        const requesterDetailsItem = (yield new AWS.DynamoDB().getItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Key: {
                userId: { S: userId }
            }
        }).promise()).Item;
        if (!!requesterDetailsItem) {
            return {
                identifiers: {
                    accountId: requesterDetailsItem["identifiers"].M["accountId"].S,
                    region: requesterDetailsItem["identifiers"].M["region"].S,
                    apiOrigin: requesterDetailsItem["identifiers"].M["apiOrigin"].S,
                },
                profile: JSON.parse(requesterDetailsItem["profile"].S)
            };
        }
        else {
            return undefined;
        }
    }),
    addToDynamoSet: (tableName, attributeKey, value) => __awaiter(void 0, void 0, void 0, function* () {
        return yield new AWS.DynamoDB().updateItem({
            TableName: tableName,
            Key: {
                key: { S: attributeKey }
            },
            UpdateExpression: 'ADD #value :add_value',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':add_value': { SS: [value] }
            }
        }).promise();
    }),
    removeFromDynamoSet: (tableName, attributeKey, value) => __awaiter(void 0, void 0, void 0, function* () {
        return yield new AWS.DynamoDB().updateItem({
            TableName: tableName,
            Key: {
                key: { S: attributeKey }
            },
            UpdateExpression: 'DELETE #value :delete_value',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':delete_value': { SS: [value] }
            }
        }).promise();
    }),
    dynamoSetContains: (tableName, attributeKey, value) => __awaiter(void 0, void 0, void 0, function* () {
        const setResult = yield new AWS.DynamoDB().getItem({
            TableName: tableName,
            Key: {
                key: { S: attributeKey }
            }
        }).promise();
        return !!setResult.Item && !!setResult.Item["value"] && !!setResult.Item["value"].SS
            && setResult.Item["value"].SS.includes(value);
    }),
    getAuthToken: (event) => {
        return event.headers[constants_1.AuthTokenHeaderName];
    },
    getUserId: (event) => {
        return event.requestContext.authorizer.claims.sub;
    },
    getThisAccountDetails: () => __awaiter(void 0, void 0, void 0, function* () {
        const profile = yield Util.getProfile();
        return {
            userId: process.env.USER_ID,
            apiOrigin: process.env.API_ORIGIN,
            name: profile.name,
            photoUrl: profile.photoUrl
        };
    }),
    putTrackedAccountDetails: (accountDetails) => __awaiter(void 0, void 0, void 0, function* () {
        yield Util.putTrackedAccount({
            userId: accountDetails.userId,
            apiOrigin: accountDetails.identifiers.apiOrigin,
            name: accountDetails.profile.name,
            photoUrl: accountDetails.profile.photoUrl
        });
    }),
    putTrackedAccount: (trackedAccount) => __awaiter(void 0, void 0, void 0, function* () {
        yield new AWS.DynamoDB().putItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Item: {
                userId: { S: trackedAccount.userId },
                apiOrigin: { S: trackedAccount.apiOrigin },
                name: { S: trackedAccount.name },
                photoUrl: { S: trackedAccount.photoUrl }
            }
        }).promise();
    }),
    subscribeToProfileUpdates: (account) => __awaiter(void 0, void 0, void 0, function* () {
        return yield new AWS.SNS().subscribe({
            TopicArn: `arn:aws:sns:${account.identifiers.region}:${account.identifiers.accountId}:ProfileUpdates-${account.userId}`,
            Endpoint: process.env.PROFILE_UPDATE_HANDLER,
            Protocol: 'lambda'
        }).promise();
    }),
    queryTimestampIndex: (tableName, indexName, partitionKey, startKey) => __awaiter(void 0, void 0, void 0, function* () {
        return yield new AWS.DynamoDB().query({
            TableName: tableName,
            IndexName: indexName,
            Limit: 5,
            ScanIndexForward: false,
            KeyConditionExpression: "#key = :key",
            ExpressionAttributeNames: {
                "#key": "key"
            },
            ExpressionAttributeValues: {
                ":key": { S: partitionKey }
            },
            ExclusiveStartKey: startKey
        }).promise();
    })
};
exports.default = Util;
