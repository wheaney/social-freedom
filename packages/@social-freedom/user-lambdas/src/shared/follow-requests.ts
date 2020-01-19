import Helpers from "../shared/helpers";
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "../shared/constants";
import {FollowRequest, FollowRequestResponse, isFollowRequestCreateResponse} from "@social-freedom/types";
import ThisAccount from "../daos/this-account";
import TrackedAccounts from "../daos/tracked-accounts";
import Dynamo from "../services/dynamo";
import SNS from "../services/sns";
import UserAPI from "../services/user-api";

export const handleFollowRequestResponse = async (response: FollowRequestResponse) => {
    // TODO - verify response account details

    const promises = [Dynamo.removeFromSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, response.accountDetails.userId)]
    if (response.accepted) {
        promises.push(
            Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, response.accountDetails.userId),
            TrackedAccounts.put(response.accountDetails),
            SNS.subscribeToProfileEvents(response.accountDetails),
            SNS.subscribeToPostEvents(response.accountDetails)
        )
    }

    return Promise.all(promises)
}

export const asyncFollowRequestCreate = async (cognitoAuthToken: string, followRequest: FollowRequest): Promise<void> => {
    const response = await UserAPI.request(followRequest.apiOrigin, 'follower/follow-requests',
        cognitoAuthToken, 'POST',  await ThisAccount.getDetails())
    if (isFollowRequestCreateResponse(response) && Helpers.isNotNullish(response.response)) {
        // if the account auto-responded, handle it
        await handleFollowRequestResponse(response.response)
    }
}