export type Profile = {
    name: string,
    photoUrl?: string,
    phone?: string,
    email?: string,
    birthday?: Date
}

export type FollowDetails = {
    accountId: string,
    region: string,
    userId: string,
    iamUserArn: string,
    profile: Profile
}