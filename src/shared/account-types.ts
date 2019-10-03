export type Profile = {
    name: string,
    photoUrl?: string,
    phone?: string,
    email?: string,
    birthday?: Date
}

export type BasicAccountIdentifiers = {
    accountId: string,
    region: string
}
export type AccountRegistrationEvent = BasicAccountIdentifiers

export type AccountIdentifiers = BasicAccountIdentifiers & {
    apiDomainName: string,
}

export type AccountDetails = {
    userId?: string,
    identifiers: AccountIdentifiers,
    profile: Profile
}

type PublicSearchField = "name" | "phone" | "email"
type VisibleField = "phone" | "email" | "birthday"
export type AccountPreferences = {
    isPublic: boolean,
    publicSearchFields: PublicSearchField[],
    visibleFields: VisibleField[],
    allowExternalPosts: boolean,
    allowExternalTags: boolean
}