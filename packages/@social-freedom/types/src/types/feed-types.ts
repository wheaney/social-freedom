import {PostDetails} from "./post-types";
import {UsersRequest, UsersResponse} from "./shared-types";

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

export type GetFeedRequest = UsersRequest & {
    lastPostKey?: string
}

export type GetFeedResponse = UsersResponse & {
    entries: FeedEntry[],
    lastEntryKey: string
}