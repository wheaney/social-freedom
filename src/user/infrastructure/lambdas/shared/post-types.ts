export enum PostType {
    Text = 'Text',
    Image = 'Image',
    Video = 'Video'
}

export type PostCreateEvent = {
    type: PostType,
    body: string,
    mediaUrl?: string
}