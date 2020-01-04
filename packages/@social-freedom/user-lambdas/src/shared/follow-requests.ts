import Util from "./util";
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "./constants";
import {FollowRequest, FollowRequestResponse, isFollowRequestCreateResponse} from "@social-freedom/types";

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