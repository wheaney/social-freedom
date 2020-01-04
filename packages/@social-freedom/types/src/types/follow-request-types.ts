import {isReducedAccountDetails, ReducedAccountDetails} from "./account-types";
import {UsersRequest, UsersResponse} from "./shared-types";
import TypeUtils from "../type-utils";

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

export type FollowRequestCreateResponse = {
    response?: FollowRequestResponse
}

export function isFollowRequest(object: any): object is FollowRequest {
    try {
        return isReducedAccountDetails(object)
    } catch (err) {
        return TypeUtils.failedCheck('FollowRequest', object)
    }
}

export function isFollowRequestResponse(object: any): object is FollowRequestResponse {
    if (TypeUtils.isNotNullish(object.accepted) && (!object.accepted || !!object.accountDetails)) {
        return true
    }

    return TypeUtils.failedCheck('FollowRequestResponse', object)
}

export function isFollowRequestCreateResponse(object: any): object is FollowRequestCreateResponse {
    try {
        if (TypeUtils.isNullish(object.response) || isFollowRequestResponse(object.response)) {
            return true
        }
    } catch (err) {
        // do nothing
    }

    return TypeUtils.failedCheck('FollowRequestCreateResponse', object)
}