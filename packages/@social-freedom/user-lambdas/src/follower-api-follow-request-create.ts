import Util, {DefaultEventValues} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest, ReducedAccountDetails} from "@social-freedom/types";
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import {isFollowingRequestingUser} from "./shared/api-gateway-event-functions";

type EventValues = DefaultEventValues & {
    isFollowing: boolean,
    isAccountPublic: boolean,
    thisAccountDetails: ReducedAccountDetails
}

export const handler = async (event: APIGatewayEvent): Promise<any> => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues: EventValues = await Util.resolveEventValues(event, {
            isFollowing: isFollowingRequestingUser,
            isAccountPublic: Util.isAccountPublic,
            thisAccountDetails: Util.getThisAccountDetails,
        })

        if (isAFollowRequest(eventValues.eventBody)) {
            /**
             * TODO - validate that userId of requester matches other account details
             */

            await Promise.all([
                Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventValues.userId),
                Util.putTrackedAccount(eventValues.eventBody),
                Util.subscribeToProfileEvents(eventValues.eventBody),
                conditionalAutoRespond(eventValues)
            ])
        }
    })
};

// TODO - replace with generic type checker, could use something like ts-transformer-keys module
export function isAFollowRequest(object: any): object is FollowRequest {
    if (Util.hasAllFields(object, ['userId', 'name', 'apiOrigin', 'profileTopicArn', 'postsTopicArn'])) {
        return true
    }

    throw new Error(`Invalid FollowRequestResponse: ${JSON.stringify(object)}`)
}

export const conditionalAutoRespond = async (eventValues: EventValues) => {
    // TODO - implement auto-denied condition (e.g. blocked account)
    const autoDenied = false
    if (autoDenied) {
        return Util.apiRequest(eventValues.thisAccountDetails.apiOrigin, '', eventValues.authToken, 'POST', {
            userId: eventValues.userId,
            accepted: false
        })
    } else if (eventValues.isAccountPublic || eventValues.isFollowing) {
        return Util.apiRequest(eventValues.thisAccountDetails.apiOrigin, '', eventValues.authToken, 'POST', {
            userId: eventValues.userId,
            accepted: false
        })
    }

    return Promise.resolve()
}