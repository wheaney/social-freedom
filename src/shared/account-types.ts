export type AccountRegistrationEvent = BasicAccountIdentifiers & {
    cognitoIdentityId: string
}

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