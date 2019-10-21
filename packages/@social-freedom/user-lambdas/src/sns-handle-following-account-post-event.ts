import {SNSEvent} from "aws-lambda";
import {FeedEntry} from "@social-freedom/types";
import Util from "./shared/util";

export const handler = async (event:SNSEvent) => {
    await Promise.all(event.Records.map(record => {
        return feedEntryCreate(JSON.parse(record.Sns.Message))
    }))
};

export const feedEntryCreate = async (feedEntry: FeedEntry) => {
    // we only care about this if we follow the account that triggered it
    if (await Util.isFollowing(feedEntry.body.userId)) {
        await Util.putFeedEntry(feedEntry)
    }
}