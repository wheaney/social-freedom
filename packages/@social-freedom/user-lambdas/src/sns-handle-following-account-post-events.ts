import {SNSEvent} from "aws-lambda";
import {FeedEntry} from "@social-freedom/types";
import Util from "./shared/util";

export const handler = async (event:SNSEvent) => {
    await Promise.all(event.Records.map(async (record) => {
        const feedEntry: FeedEntry = JSON.parse(record.Sns.Message)
        if (await isValidAndRelevant(feedEntry, record.Sns.TopicArn)) {
            await Util.putFeedEntry(feedEntry)
        }
    }))
};

export const isValidAndRelevant = async (feedEntry: FeedEntry, eventTopicArn: string) => {
    // we only care about a post if we follow the account that triggered it
    if (await Util.isFollowing(feedEntry.body.userId)) {
        // check that this came from an expected posts topic ARN
        const accountDetails = await Util.getTrackedAccountDetails(feedEntry.userId)
        return accountDetails.postsTopicArn === eventTopicArn
    }

    return false
}