import {PostDetails} from "./post-types";
import {ReducedAccountDetails} from "./account-types";

export type FeedEntryType = 'Post' | 'PostActivity' | 'ProfileUpdate'
export type FeedEntryOperation = 'Create' | 'Read' | 'Update' | 'Delete'

export type FeedEntry = {
    id: string,
    timestamp: number,
    type: FeedEntryType,
    operation: FeedEntryOperation,
    userId: string,
    body: PostDetails
}

export type GetFeedRequest = {
    cachedUsers?: string[],
    lastPostKey?: string
}

export type GetFeedResponse = {
    users: { [userId: string]: ReducedAccountDetails },
    entries: FeedEntry[],
    lastEntryKey: string
}