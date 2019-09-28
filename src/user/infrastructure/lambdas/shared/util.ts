import {PromiseResult} from "aws-sdk/lib/request";
import {GetItemOutput} from "aws-sdk/clients/dynamodb";
import * as AWS from "aws-sdk";
import {AWSError} from "aws-sdk";
import {APIGatewayEvent} from "aws-lambda";
import * as http from "http";
import {Profile} from "../../../../shared/account-types";
import {AccountDetailsIsPublicKey, FollowersTablePartitionKey, FollowingTablePartitionKey} from "./constants";

// TODO - unit testing

export function internalAPIIdentityCheck(event: APIGatewayEvent): void {
    if (!event || !event.requestContext || !event.requestContext.identity ||
        process.env.COGNITO_IDENTITY_ID !== event.requestContext.identity.cognitoIdentityId) {
        throw new Error('Unauthorized identity')
    }
}

export async function followerAPIIdentityCheck(event: APIGatewayEvent): Promise<void> {
    if (!event || !event.requestContext || !event.requestContext.identity ||
        (!await isFollowerIdentity(event.requestContext.identity.cognitoIdentityId) &&
            process.env.COGNITO_IDENTITY_ID !== event.requestContext.identity.cognitoIdentityId)) {
        throw new Error('Unauthorized identity')
    }
}

export async function isAccountPublic(): Promise<boolean> {
    const isAccountPublicItem: PromiseResult<GetItemOutput, AWSError> = await new AWS.DynamoDB().getItem({
        TableName: process.env.ACCOUNT_DETAILS_TABLE,
        Key: {
            key: {S: AccountDetailsIsPublicKey}
        }
    }).promise()

    return !!isAccountPublicItem.Item && !!isAccountPublicItem.Item['value'] &&
        !!isAccountPublicItem.Item['value'].BOOL
}

export async function getProfile(): Promise<Profile> {
    // TODO

    return {} as Profile
}

export async function isFollowerIdentity(cognitoIdentityId: string): Promise<boolean> {
    const followerEntry = await new AWS.DynamoDB().getItem({
        TableName: process.env.FOLLOWERS_TABLE,
        Key: {
            key: {S: FollowersTablePartitionKey},
            cognitoIdentityId: {S: cognitoIdentityId}
        }
    }).promise()

    return !!followerEntry.Item
}

export async function isFollower(userId: string): Promise<boolean> {
    const queryResult = await new AWS.DynamoDB().query({
        IndexName: 'FollowersByUserId',
        TableName: process.env.FOLLOWERS_TABLE,
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: {
            "#userId": "userId"
        },
        ExpressionAttributeValues: {
            ":userId": {S: userId}
        }
    }).promise()

    return queryResult.Count !== 0
}

export async function isFollowing(userId: string): Promise<boolean> {
    const followingEntry = await new AWS.DynamoDB().getItem({
        TableName: process.env.FOLLOWING_TABLE,
        Key: {
            key: {S: FollowingTablePartitionKey},
            userId: {S: userId}
        }
    }).promise()

    return !!followingEntry.Item
}

export async function apiRequest(hostname: string, path: string, authToken: string,
                                 requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                                 requestBody?: any) {
    const requestBodyString:string = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody)
    const additionalRequestHeaders = requestBodyString && {
        'Content-Type': 'application/json',
        'Content-Length': requestBodyString.length
    }
    const req = http.request({
        hostname: hostname,
        path: path,
        method: requestMethod,
        headers: {
            Authorization: authToken,
            ...additionalRequestHeaders
        }
    }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
            throw new Error('statusCode=' + res.statusCode)
        }
        let body:any[] = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        });
        res.on('end', function() {
            try {
                body = JSON.parse(Buffer.concat(body).toString());
            } catch(e) {
                throw e
            }
            return body
        });
    });
    req.on('error', function(err) {
        throw err
    });
    if (requestBodyString) {
        req.write(requestBodyString);
    }
    req.end();
}