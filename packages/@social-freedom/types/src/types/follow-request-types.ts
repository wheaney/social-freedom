import {AccountDetails} from "./account-types";

export type FollowRequest = AccountDetails
export type InternalFollowResponse = {
    userId: string,
    accepted: boolean
}
export type FollowRequestResponse = {
    accepted: boolean,
    accountDetails?: AccountDetails
}