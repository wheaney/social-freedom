import APIGateway, {EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {
    FeedEntry,
    FeedEntryOperation,
    FeedEntryType,
    GetFeedRequest,
    GetFeedResponse,
    isPostDetails
} from "@social-freedom/types";
import TrackedAccounts from "./daos/tracked-accounts";
import Feed from "./daos/feed";
import {AttributeMap} from "aws-sdk/clients/dynamodb";

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

    const feedEntries: FeedEntry[] = queryResult.Items.map(dynamoValueToFeedEntry)
    return {
        users: await TrackedAccounts.getAll(feedEntries.map(entry => entry.userId), request.cachedUsers),
        entries: feedEntries,
        lastEntryKey: queryResult.LastEvaluatedKey?.['timeSortKey'].S
    }
}

export const dynamoValueToFeedEntry = (value: AttributeMap): FeedEntry => {
    const postDetails = JSON.parse(value?.['body']?.S)
    if (isPostDetails(postDetails)) {
        return {
            id: value['id'].S,
            userId: value['userId'].S,
            type: value['type'].S as FeedEntryType,
            operation: value['operation'].S as FeedEntryOperation,
            body: postDetails,
            timestamp: Number.parseInt(value['timestamp'].N)
        }
    }

    return undefined
}