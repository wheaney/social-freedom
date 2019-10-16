export type FeedEntryType = 'Post' | 'PostActivity' | 'ProfileUpdate'
export type BasicFeedBody = {
    id: string,
    userId: string,
    receivingUserId: string,
    timestamp: number
}

export type FeedEntry = {
    id: string,
    timestamp: number,
    type: FeedEntryType,
    body: BasicFeedBody
}