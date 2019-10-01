import {PromiseResult} from "aws-sdk/lib/request";
import {GetItemOutput} from "aws-sdk/clients/dynamodb";
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
    const queryResult = await new AWS.DynamoDB().query({
        TableName: process.env.TRACKED_ACCOUNTS_TABLE,
        IndexName: 'AccountsByIdentityId',
        KeyConditionExpression: "#cognitoIdentityId = :cognitoIdentityId",
        ExpressionAttributeNames: {
            "#cognitoIdentityId": "cognitoIdentityId"
        },
        ExpressionAttributeValues: {
            ":cognitoIdentityId": {S: cognitoIdentityId}
        }
    }).promise()

    if (queryResult.Count === 0) return false

    return await isFollower(queryResult.Items[0]["userId"].S)
}

export async function isFollower(userId: string): Promise<boolean> {
    return await dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, userId)
}

export async function isFollowing(userId: string): Promise<boolean> {
    return await dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, userId)
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

export async function getTrackedAccountDetails(userId: string):Promise<AccountDetails> {
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
}

export async function addToDynamoSet(tableName: string, attributeKey: string, value: string) {
    return await new AWS.DynamoDB().updateItem({
        TableName: tableName,
        Key: {
            key: {S: attributeKey}
        },
        UpdateExpression: 'ADD #value :add_value)',
        ExpressionAttributeNames: {
            '#value': 'value'
        },
        ExpressionAttributeValues: {
            ':add_value': {SS: [value]}
        }
    }).promise()
}

export async function removeFromDynamoSet(tableName: string, attributeKey: string, value: string) {
    return await new AWS.DynamoDB().updateItem({
        TableName: tableName,
        Key: {
            key: {S: attributeKey}
        },
        UpdateExpression: 'DELETE #value :delete_value)',
        ExpressionAttributeNames: {
            '#value': 'value'
        },
        ExpressionAttributeValues: {
            ':delete_value': {SS: [value]}
        }
    }).promise()
}

export async function dynamoSetContains(tableName: string, attributeKey: string, value: string): Promise<boolean> {
    const setResult = await new AWS.DynamoDB().getItem({
        TableName: tableName,
        Key: {
            key: {S: attributeKey}
        }
    }).promise()

    return !!setResult.Item && !!setResult.Item["value"] && !!setResult.Item["value"].SS
        && setResult.Item["value"].SS.includes(value)
}

export function getAuthToken(event:APIGatewayEvent) {
    return event.headers[AuthTokenHeaderName]
}

export async function getThisAccountDetails() {
    return {
        identifiers: {
            accountId: process.env.ACCOUNT_ID,
            region: process.env.REGION,
            apiDomainName: process.env.API_DOMAIN_NAME
        },
        profile: await getProfile()
    }
}

export async function putTrackedAccountDetails(accountDetails: AccountDetails) {
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
}