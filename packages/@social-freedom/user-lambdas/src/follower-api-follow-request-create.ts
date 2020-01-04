import Util, {DefaultEventValues} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequestCreateResponse, isFollowRequest, ReducedAccountDetails} from "@social-freedom/types";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIncomingFollowRequestsKey, AccountDetailsRejectedFollowRequestsKey
} from "./shared/constants";
import {getUserId, isFollowingRequestingUser} from "./shared/api-gateway-event-functions";

type EventValues = DefaultEventValues & {
    isFollowing: boolean,
    isAccountPublic: boolean,
    thisAccountDetails: ReducedAccountDetails,
    hasPreviouslyRejectedRequest: boolean
}

export const handler = async (event: APIGatewayEvent): Promise<any> => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues: EventValues = await Util.resolveEventValues(event, {
            isFollowing: isFollowingRequestingUser,
            isAccountPublic: Util.isAccountPublic,
            thisAccountDetails: Util.getThisAccountDetails,
            hasPreviouslyRejectedRequest: hasPreviouslyRejectedRequest
        })

        if (isFollowRequest(eventValues.eventBody)) {
            /**
             * TODO - validate that userId of requester matches other account details
             */

            return conditionalAutoRespond(eventValues)
        }

        return undefined
    })
};

export const hasPreviouslyRejectedRequest = async (event: APIGatewayEvent) => {
    return Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsRejectedFollowRequestsKey, getUserId(event))
}

export const conditionalAutoRespond = async (eventValues: EventValues): Promise<FollowRequestCreateResponse> => {
    if (eventValues.hasPreviouslyRejectedRequest) {
        return {
            response: {
                accepted: false
            }
        }
    } else if (eventValues.isAccountPublic || eventValues.isFollowing) {
        await Promise.all([
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, eventValues.userId),
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, eventValues.userId),
            Util.putTrackedAccount(eventValues.eventBody),
            Util.subscribeToProfileEvents(eventValues.eventBody),
            Util.subscribeToPostEvents(eventValues.eventBody)
        ])

        return {
            response: {
                accepted: true,
                accountDetails: eventValues.thisAccountDetails
            }
        }
    }

    // no auto-response
    await Promise.all([
        Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventValues.userId),
        Util.putTrackedAccount(eventValues.eventBody),
        Util.subscribeToProfileEvents(eventValues.eventBody)
    ])
    return {}
}