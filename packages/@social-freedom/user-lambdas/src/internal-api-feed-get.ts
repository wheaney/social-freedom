import Util from "./shared/util";
import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {FeedTablePartitionKey} from "./shared/constants";
import {FeedEntryOperation, FeedEntryType, GetFeedRequest, GetFeedResponse} from "@social-freedom/types";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        await APIGateway.internalAPIIdentityCheck(event)

        const params = event.queryStringParameters
        return await feedGet(params ? {
            cachedUsers: params['cachedUsers'] && params['cachedUsers'].split(",") || [],
            lastPostKey: params['lastPostKey']
        } : {})
    })
}

export const feedGet = async (request: GetFeedRequest): Promise<GetFeedResponse> => {
    let startKey;
    if (request.lastPostKey) {
        const lastPostId = request.lastPostKey.substring(request.lastPostKey.indexOf('-')+1)
        startKey = {
            key: {S: FeedTablePartitionKey},
            timeSortKey: {S: request.lastPostKey},
            id: {S: lastPostId}
        }
    }
    const queryResult = await Util.queryTimestampIndex(process.env.FEED_TABLE, 'FeedByTimestamp',
        FeedTablePartitionKey, startKey)

    const response:GetFeedResponse = {
        users: {},
        entries: queryResult.Items.map(entryValue => ({
            id: entryValue['id'].S,
            userId: entryValue['userId'].S,
            type: entryValue['type'].S as FeedEntryType,
            operation: entryValue['operation'].S as FeedEntryOperation,
            body: JSON.parse(entryValue['body'].S),
            timestamp: Number.parseInt(entryValue['timestamp'].N)
        })),
        lastEntryKey: queryResult.LastEvaluatedKey && queryResult.LastEvaluatedKey['timeSortKey'].S
    }

    response.users = await Util.usersRequest(request.cachedUsers, response.entries.map(entry => entry.userId))

    return response
}