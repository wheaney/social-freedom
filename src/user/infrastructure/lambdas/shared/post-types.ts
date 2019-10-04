export enum PostType {
    Text = 'Text',
    Image = 'Image',
    Video = 'Video'
}

export type BasicPostDetails = {
    type: PostType,
    body: string,
    mediaUrl?: string
}

export type FullPostDetails = BasicPostDetails & {
    id: string,
    timestamp: number
}