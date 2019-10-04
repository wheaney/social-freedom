import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {PostsTablePartitionKey} from "./shared/constants";
import {FullPostDetails, PostType} from "./shared/post-types";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        await Util.followerAPIIdentityCheck(event)

        return await postsGet()
    })
}

// TODO - add ability to pass startKey to query, allows for pagination/scrolling
export const postsGet = async (): Promise<FullPostDetails[]> => {
    const queryResult = await Util.queryTimestampIndex(process.env.POSTS_TABLE, 'PostsByTimestamp', PostsTablePartitionKey)

    return queryResult.Items.map(postValue => ({
        id: postValue['id'].S,
        type: postValue['type'].S as PostType,
        body: postValue['body'].S,
        mediaUrl: postValue['mediaUrl'] ? postValue['mediaUrl'].S : undefined,
        timestamp: Number.parseInt(postValue['timestamp'].N)
    }))
}