import {ReducedAccountDetails} from "./account-types";
import {UsersRequest, UsersResponse} from "./shared-types";

export type FollowRequest = ReducedAccountDetails
export type InternalFollowResponse = {
    userId: string,
    accepted: boolean
}
export type FollowRequestResponse = {
    accepted: boolean,
    accountDetails?: ReducedAccountDetails
}

export type FollowRequestsRequest = UsersRequest
export type FollowRequestsResponse = UsersResponse & {
    userIds: string[]
}