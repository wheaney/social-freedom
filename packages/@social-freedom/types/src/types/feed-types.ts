import {isPostDetails, PostDetails} from "./post-types";
import {UsersRequest, UsersResponse} from "./shared-types";
import TypeUtils from "../type-utils";

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

export function isFeedEntry(object: any): object is FeedEntry {
    if (TypeUtils.isType('FeedEntry', object, 'id', 'timestamp', 'type', 'operation', 'userId', 'body')) {
        try {
            return isPostDetails(object.body)
        } catch (err) {
            TypeUtils.failedCheck('FeedEntry', object)
        }
    }

    return false
}

export type GetFeedRequest = UsersRequest & {
    lastPostKey?: string
}

export type GetFeedResponse = UsersResponse & {
    entries: FeedEntry[],
    lastEntryKey: string
}