import {ReducedAccountDetails} from "./account-types";

export type FollowRequest = ReducedAccountDetails
export type InternalFollowResponse = {
    userId: string,
    accepted: boolean
}
export type FollowRequestResponse = {
    accepted: boolean,
    accountDetails?: ReducedAccountDetails
}