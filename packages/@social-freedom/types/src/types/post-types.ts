import {UserDetails} from "./account-types";
import TypeUtils from "../type-utils";

export enum PostType {
    Text = 'Text',
    Image = 'Image',
    Video = 'Video'
}

export type BasicPostDetails = {
    userId: string,
    type: PostType,
    body: string,
    mediaUrl?: string
}

export type PostDetails = BasicPostDetails & {
    id: string,
    timestamp: number
}

export function isPostDetails(object: any): object is PostDetails {
    return TypeUtils.isType('PostDetails', object, 'id', 'timestamp', 'userId', 'type', 'body')
}

export type GetPostsRequest = {
    cachedUsers?: string[],
    lastPostKey?: string
}

export type GetPostsResponse = {
    users: UserDetails,
    posts: PostDetails[],
    lastPostKey: string
}