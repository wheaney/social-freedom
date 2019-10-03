import {AccountDetails} from "../../../../src/shared/account-types";

export const FollowingAccountDetails:AccountDetails = {
    userId: "followingUserId",
    identifiers: {
        accountId: "followingAccountId",
        region: "followingRegion",
        apiDomainName: "apiDomainName"
    },
    profile: {
        name: "Following User",
        photoUrl: "followingUserPhoto"
    }
}

export const ThisAccountDetails:AccountDetails = {
    userId: "someUserId",
    identifiers: {
        region: "us-west-1",
        accountId: "12345",
        apiDomainName: "myApiDomain.com"
    },
    profile: {
        name: "Wayne Heaney",
        photoUrl: "somePhotoUrl"
    }
}

export function setupEnvironmentVariables() {
    process.env = {
        USER_ID: "someUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345",
        ACCOUNT_DETAILS_TABLE: "AccountDetails",
        ACCOUNTS_TABLE: "Accounts",
        POSTS_TABLE: "PostsTableName",
        API_DOMAIN_NAME: "myApiDomain.com",
        PROFILE_UPDATE_HANDLER: "profileUpdateHandlerArn"
    }
}