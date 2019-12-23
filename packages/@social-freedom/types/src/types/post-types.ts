import {UserDetails} from "./account-types";

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

export type GetPostsRequest = {
    cachedUsers?: string[],
    lastPostKey?: string
}

export type GetPostsResponse = {
    users: UserDetails,
    posts: PostDetails[],
    lastPostKey: string
}