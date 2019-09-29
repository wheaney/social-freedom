export type Profile = {
    name: string,
    photoUrl?: string,
    phone?: string,
    email?: string,
    birthday?: Date
}

export type BasicAccountIdentifiers = {
    cognitoIdentityId: string
    accountId: string,
    region: string
}
export type AccountRegistrationEvent = BasicAccountIdentifiers

export type AccountIdentifiers = BasicAccountIdentifiers & {
    userId: string,
    apiDomainName: string,
}

export type AccountDetails = {
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