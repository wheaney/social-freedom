import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {GetPostsRequest, GetPostsResponse, PostType, ReducedAccountDetails} from "@social-freedom/types";
import * as AWS from "aws-sdk";
import {AttributeMap} from "aws-sdk/clients/dynamodb";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        await Util.followerAPIIdentityCheck(event)

        const params = event.queryStringParameters
        return await postsGet(params ? {
            cachedUsers: params['cachedUsers'] && params['cachedUsers'].split(",") || [],
            lastPostKey: params['lastPostKey']
        } : {})
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
    const queryResult = await Util.queryTimestampIndex(process.env.POSTS_TABLE, 'PostsByTimestamp',
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

    // the request tells us which account details are already known, ignore those and retrieve any that remain
    const userIds = response.posts.map(post => post.userId).filter(userId => !request.cachedUsers || !request.cachedUsers.includes(userId))
    if (userIds.length > 0) {
        const uniqueIds = [...new Set(userIds)]
        const usersResult = await new AWS.DynamoDB().batchGetItem({
            RequestItems: {
                [process.env.TRACKED_ACCOUNTS_TABLE]: {
                    Keys: uniqueIds.map(userId => ({
                        userId: {S: userId}
                    }))
                }
            }
        }).promise()
        response.users = usersResult.Responses[process.env.TRACKED_ACCOUNTS_TABLE].reduce((acc: { [userId: string]: ReducedAccountDetails }, current: AttributeMap) => {
            const accountDetails = {
                userId: current['userId'].S,
                apiOrigin: current['apiOrigin'].S,
                name: current['name'].S,
                photoUrl: current['photoUrl'] ? current['photoUrl'].S : undefined
            }
            acc[accountDetails.userId] = accountDetails

            return acc
        }, {})
    }

    return response
}