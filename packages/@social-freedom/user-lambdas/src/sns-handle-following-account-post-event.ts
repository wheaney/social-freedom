import {SNSEvent} from "aws-lambda";
import {BasicFeedBody} from "@social-freedom/types";
import Util from "./shared/util";

export const handler = async (event:SNSEvent) => {
    await Promise.all(event.Records.map(record => {
        return feedEntryCreate(JSON.parse(record.Sns.Message))
    }))
};

export const feedEntryCreate = async (post: BasicFeedBody) => {
    // we only care about this if we follow the account that triggered it
    if (await Util.isFollowing(post.userId)) {
        await Util.putFeedEntry({
            id: post.id,
            timestamp: post.timestamp,
            type: 'Post',
            body: post
        })
    }
}