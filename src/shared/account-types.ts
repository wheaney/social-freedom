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

export type AccountPreferences = {
    isPublic: boolean,
    publicSearchFields: "name" | "phone" | "email",
    visibleFields: "phone" | "email" | "birthday",
    allowExternalPosts: boolean,
    allowExternalTags: boolean
}