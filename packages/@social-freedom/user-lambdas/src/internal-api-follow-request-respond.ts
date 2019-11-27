import {APIGatewayEvent} from "aws-lambda";
import Util from "./shared/util";
import {InternalFollowResponse} from "@social-freedom/types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey
} from "./shared/constants";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        await internalFollowRequestRespond(Util.getAuthToken(event), {
            ...JSON.parse(event.body),
            userId: Util.getUserId(event)
        })
    })
};

export const internalFollowRequestRespond = async (cognitoAuthToken: string, response: InternalFollowResponse) => {
    const requestExists: boolean = await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, response.userId)
    const requesterDetails = requestExists && await Util.getTrackedAccountDetails(response.userId)

    if (requestExists && requesterDetails) {
        const followerApiResponsePayload = {
            accepted: response.accepted
        }
        if (response.accepted) {
            await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, requesterDetails.userId)

            followerApiResponsePayload['accountDetails'] = await Util.getThisAccountDetails()
        } else {
            // TODO - unsubscribe from SNS topic
        }

        await Util.apiRequest(requesterDetails.apiOrigin, 'follower/follow-request-response', cognitoAuthToken,
            'POST', followerApiResponsePayload)

        // if this account isn't public and we're not already following, request to follow them
        if (response.accepted && !await Util.isAccountPublic() && !await Util.isFollowing(response.userId) ) {
            await Promise.all([
                Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, requesterDetails.userId),
                Util.apiRequest(requesterDetails.apiOrigin, 'follower/follow-request',
                    cognitoAuthToken, 'POST', followerApiResponsePayload['accountDetails'])
            ])
        }

        // Remove the follow request from the list of received requests
        await Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, response.userId)
    } else {
        console.error('Received invalid InternalFollowResponse', {
            requestExists: requestExists,
            requesterDetailsExists: !!requesterDetails
        })
    }
}