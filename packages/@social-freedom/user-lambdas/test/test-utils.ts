import {AccountDetails, ReducedAccountDetails} from "@social-freedom/types";

export const FollowingAccountDetailsFull:AccountDetails = {
    userId: "followingUserId",
    identifiers: {
        accountId: "followingAccountId",
        region: "followingRegion",
        apiOrigin: "apiDomainName"
    },
    profile: {
        name: "Following User",
        photoUrl: "followingUserPhoto"
    }
}

export const FollowingAccountDetails: ReducedAccountDetails = {
    userId: FollowingAccountDetailsFull.userId,
    apiOrigin: FollowingAccountDetailsFull.identifiers.apiOrigin,
    name: FollowingAccountDetailsFull.profile.name,
    photoUrl: FollowingAccountDetailsFull.profile.photoUrl
}

export const ThisAccountDetailsFull:AccountDetails = {
    userId: "someUserId",
    identifiers: {
        region: "us-west-1",
        accountId: "12345",
        apiOrigin: "myApiDomain.com"
    },
    profile: {
        name: "Wayne Heaney",
        photoUrl: "somePhotoUrl"
    }
}

export const ThisAccountDetails: ReducedAccountDetails = {
    userId: ThisAccountDetailsFull.userId,
    apiOrigin: ThisAccountDetailsFull.identifiers.apiOrigin,
    name: ThisAccountDetailsFull.profile.name,
    photoUrl: ThisAccountDetailsFull.profile.photoUrl
}

export function setupEnvironmentVariables() {
    process.env = {
        USER_ID: "someUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345",
        ACCOUNT_DETAILS_TABLE: "AccountDetails",
        ACCOUNTS_TABLE: "Accounts",
        POSTS_TABLE: "PostsTableName",
        API_ORIGIN: "myApiDomain.com",
        PROFILE_UPDATE_HANDLER: "profileUpdateHandlerArn"
    }
}