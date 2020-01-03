import Util from "./util";
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "./constants";
import {FollowRequestResponse} from "@social-freedom/types";
import {FollowRequest, FollowRequestCreateResponse, ReducedAccountDetails} from "@social-freedom/types";


export function isReducedAccountDetails(object: any): object is ReducedAccountDetails {
    if (!!object.userId && !!object.name && !!object.apiOrigin && !!object.profileTopicArn && !!object.postsTopicArn) {
        return true
    }

    throw new Error(`Invalid object ${object}`)
}

export function isFollowRequest(object: any): object is FollowRequest {
    return isReducedAccountDetails(object)
}

export function isFollowRequestResponse(object: any): object is FollowRequestResponse {
    if (object.accepted !== undefined && (!object.accepted || !!object.accountDetails)) {
        return true
    }

    throw new Error(`Invalid FollowRequestResponse ${object}`)
}

export function isFollowRequestCreateResponse(object: any): object is FollowRequestCreateResponse {
    if (!object.response || isFollowRequestResponse(object.response)) {
        return true
    }

    throw new Error(`Invalid FollowRequestCreateResponse ${JSON.stringify(object)}`)
}

export const handleFollowRequestResponse = async (response: FollowRequestResponse) => {
    // TODO - verify response account details

    const promises = [Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, response.accountDetails.userId)]
    if (response.accepted) {
        promises.push(
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, response.accountDetails.userId),
            Util.putTrackedAccount(response.accountDetails),
            Util.subscribeToProfileEvents(response.accountDetails),
            Util.subscribeToPostEvents(response.accountDetails)
        )
    }

    return Promise.all(promises)
}

export const asyncFollowRequestCreate = async (cognitoAuthToken: string, followRequest: FollowRequest): Promise<void> => {
    const response = await Util.apiRequest(followRequest.apiOrigin, 'follower/follow-requests',
        cognitoAuthToken, 'POST',  await Util.getThisAccountDetails())
    if (isFollowRequestCreateResponse(response)) {
        console.error(JSON.stringify(response))
        if (Util.isNotNullish(response.response)) {
            // handle auto-response
            await handleFollowRequestResponse(response.response)
        }
    }
}