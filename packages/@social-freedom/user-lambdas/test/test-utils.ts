import {AccountDetails, ReducedAccountDetails, AsyncAPIRequest} from "@social-freedom/types"
import {AWSError, Request} from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";
import {TestObject} from "../../types/test/types/shared";
import {AuthTokenHeaderName} from "../src/shared/constants";
import {APIGatewayEvent} from "aws-lambda";

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

export const TestAsyncAPIRequest: AsyncAPIRequest = {
    origin: 'origin',
    path: 'path',
    authToken: 'authToken',
    requestMethod: 'POST',
    requestBody: TestObject
}

export function setupEnvironmentVariables() {
    process.env = {
        ...process.env,
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
        TRACKED_ACCOUNTS_TABLE: "TrackedAccountsTableName",
        API_REQUESTS_QUEUE_URL: "APIRequestsQueueURL"
    }
}

export function allowSynchronousApiRequests() {
    process.env = {
        ...process.env,
        ALLOW_SYNCHRONOUS_API_REQUESTS: 'true'
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

export function mockConsole(level: 'debug' | 'error' | 'info' | 'log' | 'warn') {
    const consoleMock = jest.spyOn(global.console, level)

    // mock implementation makes it so that this test doesn't produce output
    consoleMock.mockImplementation(() => {})

    return consoleMock
}

export const ThisUserEvent = {
    requestContext: {
        authorizer: {
            claims: {
                sub: "thisUserId"
            }
        }
    },
    headers: {
        [AuthTokenHeaderName]: "authToken"
    },
    body: JSON.stringify({foo: 'bar'}),
    queryStringParameters: {
        cachedUsers: "userId,otherUserId"
    }
} as unknown as APIGatewayEvent

export const OtherUserEvent = {
    requestContext: {
        authorizer: {
            claims: {
                sub: "otherUserId"
            }
        }
    }
} as unknown as APIGatewayEvent