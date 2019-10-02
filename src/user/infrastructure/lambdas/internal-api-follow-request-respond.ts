import {APIGatewayEvent} from "aws-lambda";
import * as Util from "./shared/util";
import {InternalFollowResponse} from "./shared/follow-request-types";
import {AccountDetailsFollowersKey, AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import {internalFollowRequestCreate} from "./internal-api-follow-request-create";

export const handler = async (event: APIGatewayEvent) => {
    Util.internalAPIIdentityCheck(event)

    await internalFollowRequestRespond(Util.getAuthToken(event), JSON.parse(event.body))

    return Util.apiGatewayLambdaResponse()
};

export const internalFollowRequestRespond = async (cognitoAuthToken: string, response: InternalFollowResponse) => {
    const requestExists: boolean = await Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, response.userId)
    const requesterDetails = requestExists && await Util.getTrackedAccountDetails(response.userId)

    if (requestExists && requesterDetails) {
        const followerApiResponsePayload = {
            accepted: response.accepted
        }
        if (response.accepted) {
            await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, response.userId)

            followerApiResponsePayload['accountDetails'] = await Util.getThisAccountDetails()
        } else {
            // TODO - unsubscribe from SNS topic
        }

        const requestApiDomain: string = requesterDetails.identifiers.apiDomainName
        await Util.apiRequest(requestApiDomain, '/follower/follow-request-response', cognitoAuthToken,
            'POST', followerApiResponsePayload)

        // if this account isn't public and we're not already following, request to follow them
        if (response.accepted && !await Util.isAccountPublic() && !await Util.isFollowing(response.userId) ) {
            await internalFollowRequestCreate(cognitoAuthToken, {
                userId: response.userId,
                ...requesterDetails
            }, followerApiResponsePayload['accountDetails'])
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