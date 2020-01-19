import APIGateway, {EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {FeedEntryOperation, FeedEntryType, GetFeedRequest, GetFeedResponse} from "@social-freedom/types";
import TrackedAccounts from "./daos/tracked-accounts";
import Feed from "./daos/feed";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.handleEvent(async () => {
        await APIGateway.internalAPIIdentityCheck(event)

        return await feedGet({
            cachedUsers: EventFunctions.cachedUsers(event),
            lastPostKey: event.queryStringParameters?.['lastPostKey']
        })
    })
}

export const feedGet = async (request: GetFeedRequest): Promise<GetFeedResponse> => {
    const queryResult = await Feed.getEntries(request.lastPostKey)

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

    response.users = await TrackedAccounts.getAll(response.entries.map(entry => entry.userId), request.cachedUsers)

    return response
}