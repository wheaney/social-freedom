export enum PostType {
    Text = 'Text',
    Image = 'Image',
    Video = 'Video'
}

export type PostCreateEvent = {
    userId: string,
    type: PostType,
    body: string,
    mediaUrl?: string
}