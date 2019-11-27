import {PromiseResult} from "aws-sdk/lib/request";
import {AttributeMap, GetItemOutput, Key} from "aws-sdk/clients/dynamodb";
import * as AWS from "aws-sdk";
import {AWSError} from "aws-sdk";
import {APIGatewayEvent} from "aws-lambda";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIsPublicKey,
    AuthTokenHeaderName,
    FeedTablePartitionKey
} from "./constants";
import {FeedEntry, Profile, ReducedAccountDetails} from "@social-freedom/types";
import fetch from 'node-fetch';
import {Response} from 'node-fetch';

// TODO - unit testing

// TODO - split this up by service/integration
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
        if (!await Util.isFollower(Util.getUserId(event))) {
            throw new Error(`Unauthorized userId: ${Util.getUserId(event)}`)
        }
    },

    apiGatewayLambdaResponse: (httpStatus: number = 200, responseBody?: any) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN
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

        return {
            name: "Testy McTesterson"
        } as Profile
    },

    isFollower: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, userId)
    },

    isFollowing: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, userId)
    },

    apiRequest: async (origin: string, path: string, authToken: string,
                                     requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                                     requestBody?: any): Promise<Response> => {
        const requestBodyString: string = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody)
        const additionalRequestHeaders = !!requestBodyString && {
            'Content-Type': 'application/json',
            'Content-Length': requestBodyString.length.toString()
        }
        const requestUrl = `${origin}${path}`
        return await fetch(requestUrl, {
            method: requestMethod,
            body: !!requestBodyString ? requestBodyString : undefined,
            headers: {
                [AuthTokenHeaderName]: authToken,
                ...additionalRequestHeaders
            }
        }).then(res => {
            if (!res.ok) {
                throw Error(`API request to URL ${requestUrl} returned with status ${res.status}`)
            }

            return res
        })
    },

    getTrackedAccountDetails: async (userId: string): Promise<ReducedAccountDetails> => {
        const requesterDetailsItem = (await new AWS.DynamoDB().getItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Key: {
                userId: {S: userId}
            }
        }).promise()).Item

        if (!!requesterDetailsItem) {
            return {
                userId: requesterDetailsItem['userId'].S,
                apiOrigin: requesterDetailsItem['apiOrigin'].S,
                postsTopicArn: requesterDetailsItem['postsTopicArn'].S,
                profileTopicArn: requesterDetailsItem['profileTopicArn'].S,
                name: requesterDetailsItem['name'].S,
                photoUrl: requesterDetailsItem['photoUrl'] ? requesterDetailsItem['photoUrl'].S : undefined
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

    getThisAccountDetails: async (): Promise<ReducedAccountDetails> => {
        const profile = await Util.getProfile()
        return {
            userId: process.env.USER_ID,
            apiOrigin: process.env.API_ORIGIN,
            postsTopicArn: process.env.POSTS_TOPIC,
            profileTopicArn: process.env.PROFILE_TOPIC,
            name: profile.name,
            photoUrl: profile.photoUrl
        }
    },

    putTrackedAccount: async (trackedAccount: ReducedAccountDetails) => {
        await new AWS.DynamoDB().putItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Item: {
                userId: {S: trackedAccount.userId},
                apiOrigin: {S: trackedAccount.apiOrigin},
                postsTopicArn: {S: trackedAccount.postsTopicArn},
                profileTopicArn: {S: trackedAccount.profileTopicArn},
                name: {S: trackedAccount.name},
                photoUrl: !!trackedAccount.photoUrl ? {S: trackedAccount.photoUrl} : undefined
            }
        }).promise()
    },

    subscribeToProfileEvents: async (account: ReducedAccountDetails) => {
        await new AWS.SNS().subscribe({
            TopicArn: account.profileTopicArn,
            Endpoint: process.env.PROFILE_EVENTS_HANDLER,
            Protocol: 'lambda'
        }).promise()
    },

    subscribeToPostEvents: async (account: ReducedAccountDetails) => {
        await new AWS.SNS().subscribe({
            TopicArn: account.postsTopicArn,
            Endpoint: process.env.POST_EVENTS_HANDLER,
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
    },

    putFeedEntry: async (entry: FeedEntry) => {
        await new AWS.DynamoDB().putItem({
            TableName: process.env.FEED_TABLE,
            Item: {
                "key": {S: FeedTablePartitionKey},
                "id": {S: entry.id},
                "timeSortKey": {S: `${entry.timestamp}-${entry.id}`},
                "timestamp": {N: `${entry.timestamp}`},
                "type": {S: entry.type},
                "operation": {S: entry.operation},
                "userId": {S: entry.userId},
                "body": {S: JSON.stringify(entry.body)}
            }
        }).promise()
    },

    getTrackedAccounts: async (uniqueUserIds: string[]):Promise<{[userId:string]: ReducedAccountDetails}> => {
        const usersResult = await new AWS.DynamoDB().batchGetItem({
            RequestItems: {
                [process.env.TRACKED_ACCOUNTS_TABLE]: {
                    Keys: uniqueUserIds.map(userId => ({
                        userId: {S: userId}
                    }))
                }
            }
        }).promise()

        return usersResult.Responses[process.env.TRACKED_ACCOUNTS_TABLE].reduce((acc: { [userId: string]: ReducedAccountDetails }, current: AttributeMap) => {
            const accountDetails = {
                userId: current['userId'].S,
                apiOrigin: current['apiOrigin'].S,
                postsTopicArn: current['postsTopicArn'].S,
                profileTopicArn: current['profileTopicArn'].S,
                name: current['name'].S,
                photoUrl: current['photoUrl'] ? current['photoUrl'].S : undefined
            }
            acc[accountDetails.userId] = accountDetails

            return acc
        }, {})
    }
}

export default Util