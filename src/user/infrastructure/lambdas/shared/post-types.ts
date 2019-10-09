import {ReducedAccountDetails} from "../../../../shared/account-types";

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

export type FullPostDetails = BasicPostDetails & {
    id: string,
    timestamp: number
}

export type GetPostsRequest = {
    cachedUsers?: string[],
    lastPostKey?: string
}

export type GetPostsResponse = {
    users: { [userId: string]: ReducedAccountDetails },
    posts: FullPostDetails[],
    lastPostKey: string
}