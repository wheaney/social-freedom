import {APIGatewayEvent} from "aws-lambda";
import APIGateway, {DefaultEventValues} from "./shared/api-gateway";
import {isInternalFollowResponse, ReducedAccountDetails} from "@social-freedom/types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey,
    AccountDetailsRejectedFollowRequestsKey
} from "./shared/constants";
import Dynamo from "./services/dynamo";
import UserAPI from "./services/user-api";
import ThisAccount from "./daos/this-account";
import TrackedAccounts from "./daos/tracked-accounts";

const EventFunctions = {
    requestExists: requestExists,
    requesterDetails: requesterDetails,
    thisAccountDetails: ThisAccount.getDetails,
    isThisAccountPublic: ThisAccount.isPublic,
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
    return await APIGateway.handleEvent(async () => {
        const eventValues: EventValues = await APIGateway.internalAPIIdentityCheck(event, EventFunctions)

        await internalFollowRequestRespond(eventValues)
    })
};

export async function requestExists(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, request.userId)
    }

    return undefined
}

export async function requesterDetails(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return TrackedAccounts.get(request.userId)
    }

    return undefined
}

export async function isAlreadyFollowing(event: APIGatewayEvent, request: any) {
    if (isInternalFollowResponse(request)) {
        return ThisAccount.isFollowing(request.userId)
    }

    return undefined
}

export const internalFollowRequestRespond = async (eventValues: EventValues) => {
    const {eventBody, authToken, requestExists, requesterDetails, thisAccountDetails, isThisAccountPublic, isAlreadyFollowingUser} = eventValues
    if (isInternalFollowResponse(eventBody) && requestExists && requesterDetails) {
        const promises = []
        promises.push(UserAPI.asyncRequest(requesterDetails.apiOrigin, 'follower/follow-request-response', authToken,
            'POST', {
                accepted: eventBody.accepted,
                accountDetails: thisAccountDetails
            }))

        if (eventBody.accepted) {
            promises.push(Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, eventBody.userId))

            if (!isThisAccountPublic && !isAlreadyFollowingUser) {
                promises.push(
                    Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, eventBody.userId),
                    UserAPI.asyncRequest(process.env.API_ORIGIN, 'internal/async/follow-requests',
                        authToken, 'POST', requesterDetails))
            }
        } else {
            promises.push(Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsRejectedFollowRequestsKey, eventBody.userId))
        }

        promises.push(Dynamo.removeFromSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventBody.userId))

        return Promise.all(promises)
    }

    return Promise.reject({
        requestExists: requestExists,
        requesterDetails: requesterDetails
    })
}