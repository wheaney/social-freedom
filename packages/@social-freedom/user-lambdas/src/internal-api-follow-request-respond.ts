import {APIGatewayEvent} from "aws-lambda";
import Util, {DefaultEventValues} from "./shared/util";
import {InternalFollowResponse, ReducedAccountDetails} from "@social-freedom/types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsOutgoingFollowRequestsKey
} from "./shared/constants";
import {isFollowingRequestingUser} from "./shared/api-gateway-event-functions";

const EventFunctions = {
    requestExists: requestExists,
    requesterDetails: requesterDetails,
    thisAccountDetails: Util.getThisAccountDetails,
    isThisAccountPublic: Util.isAccountPublic,
    isAlreadyFollowingUser: isFollowingRequestingUser
}

type EventValues = DefaultEventValues & {
    requestExists: boolean,
    requesterDetails: ReducedAccountDetails,
    thisAccountDetails: ReducedAccountDetails,
    isThisAccountPublic: boolean,
    isAlreadyFollowingUser: boolean
}

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues: EventValues = await Util.internalAPIIdentityCheck(event, EventFunctions)

        await internalFollowRequestRespond(eventValues)
    })
};

// TODO - replace with generic type checker, could use something like ts-transformer-keys module
export function isAnInternalFollowResponse(object: any): object is InternalFollowResponse {
    if (Util.isNotNullish(object.userId) && Util.isNotNullish(object.accepted)) {
        return true
    }

    throw new Error(`Invalid InternalFollowResponse: ${JSON.stringify(object)}`)
}

export async function requestExists(event: APIGatewayEvent, request: any) {
    if (isAnInternalFollowResponse(request)) {
        return Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, request.userId)
    }

    return undefined
}

export async function requesterDetails(event: APIGatewayEvent, request: any) {
    if (isAnInternalFollowResponse(request)) {
        return Util.getTrackedAccountDetails(request.userId)
    }

    return undefined
}

export const internalFollowRequestRespond = async (eventValues: EventValues) => {
    const {eventBody, authToken, requestExists, requesterDetails, thisAccountDetails, isThisAccountPublic, isAlreadyFollowingUser} = eventValues
    if (isAnInternalFollowResponse(eventBody) && requestExists && requesterDetails) {
        await Util.apiRequest(requesterDetails.apiOrigin, 'follower/follow-request-response', authToken,
            'POST', {
                accepted: eventBody.accepted,
                accountDetails: eventBody.accepted ? thisAccountDetails : undefined
            })

        const promises = []
        if (eventBody.accepted) {
            promises.push(Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, eventBody.userId))

            if (!isThisAccountPublic && !isAlreadyFollowingUser) {
                promises.push(
                    Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, eventBody.userId),
                    Util.apiRequest(requesterDetails.apiOrigin, 'follower/follow-request',
                        authToken, 'POST', thisAccountDetails))
            }
        }

        promises.push(Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventBody.userId))

        return Promise.all(promises)
    }

    return Promise.reject({
        requestExists: requestExists,
        requesterDetails: requesterDetails
    })
}