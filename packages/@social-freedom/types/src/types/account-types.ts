import TypeUtils from "../type-utils";


export type Profile = {
    name: string,
    photoUrl?: string,
    phone?: string,
    email?: string,
    birthday?: Date
}

export function isProfile(object: any): object is Profile {
    return TypeUtils.isType('Profile', object, 'name')
}

export type BasicAccountIdentifiers = {
    accountId: string,
    region: string,
    apiOrigin?: string,
    profileTopicArn?: string,
    postsTopicArn?: string
}
export type RegisterAccountRequest = BasicAccountIdentifiers

export type AccountIdentifiers = BasicAccountIdentifiers & {
    apiOrigin: string,
    profileTopicArn: string,
    postsTopicArn: string
}

export type AccountDetails = {
    userId?: string,
    identifiers: AccountIdentifiers,
    profile: Profile
}

export type ReducedAccountDetails = {
    userId: string,
    name: string,
    photoUrl?: string,
    apiOrigin: string,
    profileTopicArn: string,
    postsTopicArn: string
}

export type UserDetails = {[userId: string]: ReducedAccountDetails}

type PublicSearchField = "name" | "phone" | "email"
type VisibleField = "phone" | "email" | "birthday"
export type AccountPreferences = {
    isPublic: boolean,
    publicSearchFields: PublicSearchField[],
    visibleFields: VisibleField[],
    allowExternalPosts: boolean,
    allowExternalTags: boolean
}

export function isReducedAccountDetails(object: any): object is ReducedAccountDetails {
    return TypeUtils.isType('ReducedAccountDetails', object, 'userId', 'name', 'apiOrigin',
        'profileTopicArn', 'postsTopicArn')
}