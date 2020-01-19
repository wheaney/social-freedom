import APIGateway, {EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {GetPostsRequest, GetPostsResponse, PostDetails, PostType} from "@social-freedom/types";
import TrackedAccounts from "./daos/tracked-accounts";
import Dynamo from "./services/dynamo";
import Helpers from "./shared/helpers";
import {AttributeMap} from "aws-sdk/clients/dynamodb";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.handleEvent(async () => {
        await APIGateway.followerAPIIdentityCheck(event)

        return await postsGet({
            cachedUsers: EventFunctions.cachedUsers(event),
            lastPostKey: event.queryStringParameters?.['lastPostKey']
        })
    })
}

export const postsGet = async (request: GetPostsRequest): Promise<GetPostsResponse> => {
    const queryResult = await Dynamo.queryTimestampIndex(process.env.POSTS_TABLE, 'PostsByTimestamp',
        PostsTablePartitionKey, Helpers.keyStringToDynamoDBKey(request.lastPostKey, PostsTablePartitionKey))

    const posts: PostDetails[] = queryResult.Items.map(dynamoValueToPostDetails)
    return {
        users: await TrackedAccounts.getAll(posts.map(post => post.userId), request.cachedUsers),
        posts: posts,
        lastPostKey: queryResult.LastEvaluatedKey?.['timeSortKey'].S
    }
}

export const dynamoValueToPostDetails = (value: AttributeMap): PostDetails => {
    return {
        id: value['id'].S,
        userId: value['userId'].S,
        type: PostType[value['type'].S],
        body: value['body'].S,
        mediaUrl: value['mediaUrl']?.S,
        timestamp: Number.parseInt(value['timestamp'].N)
    }
}