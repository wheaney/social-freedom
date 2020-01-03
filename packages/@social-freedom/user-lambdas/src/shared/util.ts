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
    ConditionalCheckFailedCode,
    FeedTablePartitionKey
} from "./constants";
import {FeedEntry, Profile, ReducedAccountDetails, UserDetails} from "@social-freedom/types";
import fetch from 'node-fetch';
import {getAuthToken, getUserId, isFollowingRequestingUser} from "./api-gateway-event-functions";

export type APIGatewayEventFunction = (event: APIGatewayEvent, eventBody: any) => any;
export type APIGatewayEventFunctions = {[key:string]:APIGatewayEventFunction};
export type DefaultAPIGatewayEventFunctions = {
    eventBody: APIGatewayEventFunction,
    userId: APIGatewayEventFunction,
    authToken: APIGatewayEventFunction
}

export type DefaultEventValues = {[key in keyof DefaultAPIGatewayEventFunctions]: any}

// TODO - unit testing

// TODO - split this up by service/integration
const Util = {
    dynamoDbClient: new AWS.DynamoDB(),

    apiGatewayProxyWrapper: async (proxyFunction: () => Promise<any>) => {
        try {
            return Util.apiGatewayLambdaResponse(200, await proxyFunction())
        } catch (err) {
            // TODO - add handling for unauthorized, return 401
            console.error(err)
            return Util.apiGatewayLambdaResponse(500)
        }
    },

    /**
     * Event functions front-load any async data retrieval/computation that can operate on just the APIGatewayEvent
     * object. All async functions will be awaited in parallel; any logic that *can* be put here should -- even if it
     * may only be conditionally used -- ideally resulting in one front-loaded await here and at most one more await
     * for any conditional update/delete operations. This will keep request processing to an ideal of only two awaits.
     *
     * @param event - the incoming request's APIGatewayEvent
     * @param eventFunctions - functions that do data retrieval or compute on the event, no update/delete operations
     *                         should occur here
     */
    resolveEventValues: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        const resolvedValues: any = {}

        // add defaults that are used frequently and aren't asynchronous
        const eventBody = event.body ? JSON.parse(event.body) : undefined
        type AllEventFunctions = T & DefaultAPIGatewayEventFunctions
        const allEventFunctions: AllEventFunctions = {
            eventBody: () => eventBody,
            userId: getUserId,
            authToken: getAuthToken,
            ...eventFunctions
        }

        Object.keys(allEventFunctions).map((key: keyof AllEventFunctions) => {
            resolvedValues[key] = allEventFunctions[key](event, eventBody)
        })

        return await Util.resolveInObject(resolvedValues)
    },

    internalAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        if (process.env.USER_ID !== getUserId(event)) {
            throw new Error(`Unauthorized userId: ${getUserId(event)}`)
        }

        return Util.resolveEventValues(event, eventFunctions)
    },

    followerAPIIdentityCheck: async <T extends APIGatewayEventFunctions, U extends DefaultEventValues & { [key in keyof T]: any }>(event: APIGatewayEvent, eventFunctions: T = {} as T): Promise<U> => {
        const resolvedEventValues: U = await Util.resolveEventValues(event, {
            ...eventFunctions,
            isFollowing: isFollowingRequestingUser
        })
        if (!resolvedEventValues.isFollowing) {
            throw new Error(`Unauthorized userId: ${resolvedEventValues.userId}`)
        }

        return resolvedEventValues
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
        const isAccountPublicItem: PromiseResult<GetItemOutput, AWSError> = await Util.dynamoDbClient.getItem({
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

    queueAPIRequest: async (origin: string, path: string, authToken: string,
                            requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                            requestBody?: any) => {
        return new AWS.SQS().sendMessage({
            QueueUrl: process.env.API_REQUESTS_QUEUE_URL,
            MessageGroupId: 'api-requests',
            MessageBody: JSON.stringify({
                origin: origin,
                path: path,
                authToken: authToken,
                requestMethod: requestMethod,
                requestBody: requestBody
            })
        }).promise()
    },

    apiRequest: async (origin: string, path: string, authToken: string,
                                     requestMethod: 'POST' | 'GET' | 'PUT' | 'DELETE',
                                     requestBody?: any): Promise<any> => {
        if (process.env.ALLOW_SYNCHRONOUS_API_REQUESTS !== "true") {
            // lambdas triggered directly by API Gateway should being queueing these requests
            throw new Error('Synchronous API requests not allowed within this function')
        }

        const startTime = Date.now()
        const requestBodyString: string = ['POST', 'PUT'].includes(requestMethod) && requestBody && JSON.stringify(requestBody)
        const additionalRequestHeaders = !!requestBodyString && {
            'Content-Type': 'application/json',
            'Content-Length': requestBodyString.length.toString()
        }
        const requestUrl = `${origin}${path}`
        const res = await fetch(requestUrl, {
            method: requestMethod,
            body: !!requestBodyString ? requestBodyString : undefined,
            headers: {
                [AuthTokenHeaderName]: authToken,
                ...additionalRequestHeaders
            }
        })
        if (!res.ok) {
            throw Error(`API request to URL ${requestUrl} returned with status ${res.status}`)
        }

        console.log(`apiRequest for ${path} took ${Date.now() - startTime}`)

        const responseBody = await res.text()
        if (responseBody?.length) {
            try {
                return JSON.parse(responseBody)
            } catch (err) {
                console.error(`Unexpected response body: ${responseBody}`)
            }
        }
    },

    getTrackedAccountDetails: async (userId: string): Promise<ReducedAccountDetails> => {
        const requesterDetailsItem = (await Util.dynamoDbClient.getItem({
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

    addToDynamoSet: async (tableName: string, attributeKey: string, value: string): Promise<any> => {
        try {
            return await Util.dynamoDbClient.updateItem({
                TableName: tableName,
                Key: {
                    key: {S: attributeKey}
                },
                UpdateExpression: 'ADD #value :add_set_value',
                ConditionExpression: 'not(contains(#value, :add_value))',
                ExpressionAttributeNames: {
                    '#value': 'value'
                },
                ExpressionAttributeValues: {
                    ':add_set_value': {SS: [value]},
                    ':add_value': {S: value}
                }
            }).promise()
        } catch (err) {
            if (err.code === ConditionalCheckFailedCode) {
                // if conditional check fails, we just do nothing
                console.error(err)
            } else {
                throw err
            }
        }
    },

    removeFromDynamoSet: async (tableName: string, attributeKey: string, value: string): Promise<any> => {
        try {
            return await Util.dynamoDbClient.updateItem({
                TableName: tableName,
                Key: {
                    key: {S: attributeKey}
                },
                UpdateExpression: 'DELETE #value :delete_set_value',
                ConditionExpression: 'contains(#value, :delete_value)',
                ExpressionAttributeNames: {
                    '#value': 'value'
                },
                ExpressionAttributeValues: {
                    ':delete_set_value': {SS: [value]},
                    ':delete_value': {S: value}
                }
            }).promise()
        } catch (err) {
            if (err.code === ConditionalCheckFailedCode) {
                // if conditional check fails, we just do nothing
                console.error(err)
            } else {
                throw err
            }
        }
    },

    getDynamoSet: async (tableName: string, attributeKey: string): Promise<string[]> => {
        const setResult = await Util.dynamoDbClient.getItem({
            TableName: tableName,
            Key: {
                key: {S: attributeKey}
            }
        }).promise()

        if (!!setResult.Item && !!setResult.Item["value"] && !!setResult.Item["value"].SS) {
            return setResult.Item["value"].SS
        }

        return []
    },

    dynamoSetContains: async (tableName: string, attributeKey: string, value: string): Promise<boolean> => {
        const setResult = await Util.getDynamoSet(tableName, attributeKey)

        return setResult.includes(value)
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
        await Util.dynamoDbClient.putItem({
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
        return await Util.dynamoDbClient.query({
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
        await Util.dynamoDbClient.putItem({
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

    getTrackedAccounts: async (uniqueUserIds: string[]):Promise<UserDetails> => {
        const usersResult = await Util.dynamoDbClient.batchGetItem({
            RequestItems: {
                [process.env.TRACKED_ACCOUNTS_TABLE]: {
                    Keys: uniqueUserIds.map(userId => ({
                        userId: {S: userId}
                    }))
                }
            }
        }).promise()

        return usersResult.Responses[process.env.TRACKED_ACCOUNTS_TABLE].reduce((acc: UserDetails, current: AttributeMap) => {
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
    },

    /**
     * Returns tracked account data for users needed by the response, limited to those that aren't already known
     * (and therefore cached) by the requester.
     *
     * @param requestUsers - the users that are already known, specified in the request
     * @param responseUsers - the users needed by the response
     */
    usersRequest: async (requestUsers: string[] = [], responseUsers: string[] = []): Promise<UserDetails> => {
        const userIds = responseUsers.filter(userId => !requestUsers.includes(userId))
        if (userIds.length > 0) {
            const uniqueIds = [...new Set(userIds)]
            return await Util.getTrackedAccounts(uniqueIds)
        }

        return {}
    },

    resolveInObject: async <T, U extends { [key in keyof T]: any }>(object: T): Promise<U> => {
        const startTime = Date.now()
        const newObject = {}
        await Promise.all(Object.keys(object).map(async (key) => {
            newObject[key] = object[key]
            if (Util.isNotNullish(object[key]) && Util.isPromise(object[key])) {
                const keyStartTime = Date.now()
                newObject[key] = await object[key]
                console.log(`resolveInObject [${key}] took ${Date.now() - keyStartTime}`)
            }
        }))

        console.log(`resolveInObject took ${Date.now() - startTime}`)

        return newObject as U
    },

    isPromise: (object: any): object is Promise<any> => {
        return !!(object as Promise<any>).then
    },

    isNullish: (object: any) => {
        return object === null || object === undefined
    },

    isNotNullish: (object: any) => {
        return object !== null && object !== undefined
    },

    hasAllFields: (object: any, fields: string[]): boolean => {
        return !fields.find(field => Util.isNullish(object[field]))
    }
}

export default Util