import APIGateway, {EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {GetPostsRequest, GetPostsResponse, PostType} from "@social-freedom/types";
import TrackedAccounts from "./daos/tracked-accounts";
import Dynamo from "./services/dynamo";

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
    let startKey;
    if (request.lastPostKey) {
        const lastPostId = request.lastPostKey.substring(request.lastPostKey.indexOf('-')+1)
        startKey = {
            key: {S: PostsTablePartitionKey},
            timeSortKey: {S: request.lastPostKey},
            id: {S: lastPostId}
        }
    }
    const queryResult = await Dynamo.queryTimestampIndex(process.env.POSTS_TABLE, 'PostsByTimestamp',
        PostsTablePartitionKey, startKey)

    const response:GetPostsResponse = {
        users: {},
        posts: queryResult.Items.map(postValue => ({
            id: postValue['id'].S,
            userId: postValue['userId'].S,
            type: postValue['type'].S as PostType,
            body: postValue['body'].S,
            mediaUrl: postValue['mediaUrl'] ? postValue['mediaUrl'].S : undefined,
            timestamp: Number.parseInt(postValue['timestamp'].N)
        })),
        lastPostKey: queryResult.LastEvaluatedKey && queryResult.LastEvaluatedKey['timeSortKey'].S
    }

    response.users = await TrackedAccounts.getAll(response.posts.map(post => post.userId), request.cachedUsers)

    return response
}