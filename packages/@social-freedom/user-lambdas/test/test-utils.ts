import {AccountDetails, ReducedAccountDetails} from "@social-freedom/types";
import {AWSError, Request} from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";

export const FollowingAccountDetailsFull:AccountDetails = {
    userId: "followingUserId",
    identifiers: {
        accountId: "followingAccountId",
        region: "followingRegion",
        apiOrigin: "apiDomainName",
        profileTopicArn: "profileTopicArn",
        postsTopicArn: "postsTopicArn"
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
    photoUrl: FollowingAccountDetailsFull.profile.photoUrl,
    profileTopicArn: FollowingAccountDetailsFull.identifiers.profileTopicArn,
    postsTopicArn: FollowingAccountDetailsFull.identifiers.postsTopicArn
}

export const ThisAccountDetailsFull:AccountDetails = {
    userId: "thisUserId",
    identifiers: {
        region: "us-west-1",
        accountId: "12345",
        apiOrigin: "myApiDomain.com",
        profileTopicArn: "profileTopicArn",
        postsTopicArn: "postsTopicArn"
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
    photoUrl: ThisAccountDetailsFull.profile.photoUrl,
    profileTopicArn: ThisAccountDetailsFull.identifiers.profileTopicArn,
    postsTopicArn: ThisAccountDetailsFull.identifiers.postsTopicArn
}

export function setupEnvironmentVariables() {
    process.env = {
        USER_ID: "thisUserId",
        REGION: "us-west-1",
        ACCOUNT_ID: "12345",
        ACCOUNT_DETAILS_TABLE: "AccountDetails",
        ACCOUNTS_TABLE: "Accounts",
        POSTS_TABLE: "PostsTableName",
        API_ORIGIN: "myApiDomain.com",
        PROFILE_EVENTS_HANDLER: "profileEventsHandlerArn",
        POST_EVENTS_HANDLER: "postEventsHandlerArn",
        POSTS_TOPIC: "postsTopic",
        PROFILE_TOPIC: "profileTopic",
        CORS_ORIGIN: "allowedOrigin",
        FEED_TABLE: "FeedTableName",
        TRACKED_ACCOUNTS_TABLE: "TrackedAccountsTableName"
    }
}

export function createAWSMock<T>(client: any, fn: string): jest.SpyInstance<Request<T, AWSError>> {
    return jest.spyOn(client, fn)
}

export function setAWSMock<T>(mock: jest.SpyInstance<Request<T, AWSError>>, promise: Promise<any>) {
    mock.mockReturnValue({
        promise: () => promise as unknown as Promise<PromiseResult<T, AWSError>>
    } as unknown as Request<T, AWSError>)
}