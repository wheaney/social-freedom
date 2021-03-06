import {SNSEvent} from "aws-lambda";
import {FeedEntry, isFeedEntry} from "@social-freedom/types";
import Feed from "./daos/feed";
import ThisAccount from "./daos/this-account";
import TrackedAccounts from "./daos/tracked-accounts";

export const handler = async (event: SNSEvent) => {
    await Promise.all(event.Records.map(async (record) => {
        const feedEntry = JSON.parse(record.Sns.Message)
        if (isFeedEntry(feedEntry) && await isValidAndRelevant(feedEntry, record.Sns.TopicArn)) {
            await Feed.putEntry(feedEntry)
        }
    }))
};

export const isValidAndRelevant = async (feedEntry: FeedEntry, eventTopicArn: string) => {
    // we only care about a post if we follow the account that triggered it
    if (await ThisAccount.isFollowing(feedEntry.body.userId)) {
        // check that this came from an expected posts topic ARN
        const accountDetails = await TrackedAccounts.get(feedEntry.userId)
        return accountDetails?.postsTopicArn === eventTopicArn

        // TODO - verify signature
    }

    return false
}