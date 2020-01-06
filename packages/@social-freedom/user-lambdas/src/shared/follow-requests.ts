import Helpers from "./helpers";
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "./constants";
import {FollowRequest, FollowRequestResponse, isFollowRequestCreateResponse} from "@social-freedom/types";
import ThisAccount from "src/daos/this-account";
import TrackedAccounts from "src/daos/tracked-accounts";
import Dynamo from "src/services/dynamo";
import SNS from "src/services/sns";
import UserAPI from "src/services/user-api";

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
    if (isFollowRequestCreateResponse(response)) {
        console.error(JSON.stringify(response))
        if (Helpers.isNotNullish(response.response)) {
            // handle auto-response
            await handleFollowRequestResponse(response.response)
        }
    }
}