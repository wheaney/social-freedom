import {APIGatewayEvent} from "aws-lambda";
import Util from "./shared/util";
import APIGateway, {DefaultEventValues} from "./shared/api-gateway";
import {isInternalFollowResponse, ReducedAccountDetails} from "@social-freedom/types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey, AccountDetailsRejectedFollowRequestsKey
} from "./shared/constants";

const EventFunctions = {
    requestExists: requestExists,
    requesterDetails: requesterDetails,
    thisAccountDetails: Util.getThisAccountDetails,
    isThisAccountPublic: Util.isAccountPublic,
    isAlreadyFollowingUser: isAlreadyFollowing
}

type EventValues = DefaultEventValues & {
    requestExists: boolean,
    requesterDetails: ReducedAccountDetails,
    thisAccountDetails: ReducedAccountDetails,
    isThisAccountPublic: boolean,
    isAlreadyFollowingUser: boolean
}

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues: EventValues = await APIGateway.internalAPIIdentityCheck(event, EventFunctions)

        await internalFollowRequestRespond(eventValues)
    })
};

export async function requestExists(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, request.userId)
    }

    return undefined
}

export async function requesterDetails(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return Util.getTrackedAccountDetails(request.userId)
    }

    return undefined
}

export async function isAlreadyFollowing(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return Util.isFollowing(request.userId)
    }

    return undefined
}

export const internalFollowRequestRespond = async (eventValues: EventValues) => {
    const {eventBody, authToken, requestExists, requesterDetails, thisAccountDetails, isThisAccountPublic, isAlreadyFollowingUser} = eventValues
    if (isInternalFollowResponse(eventBody) && requestExists && requesterDetails) {
        const promises = []
        promises.push(Util.queueAPIRequest(requesterDetails.apiOrigin, 'follower/follow-request-response', authToken,
            'POST', {
                accepted: eventBody.accepted,
                accountDetails: eventBody.accepted ? thisAccountDetails : undefined
            }))

        if (eventBody.accepted) {
            promises.push(Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, eventBody.userId))

            if (!isThisAccountPublic && !isAlreadyFollowingUser) {
                promises.push(
                    Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, eventBody.userId),
                    Util.queueAPIRequest(process.env.API_ORIGIN, 'internal/async/follow-requests',
                        authToken, 'POST', requesterDetails))
            }
        } else {
            promises.push(Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsRejectedFollowRequestsKey, eventBody.userId))
        }

        promises.push(Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventBody.userId))

        return Promise.all(promises)
    }

    return Promise.reject({
        requestExists: requestExists,
        requesterDetails: requesterDetails
    })
}