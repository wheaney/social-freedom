import {APIGatewayEvent} from "aws-lambda";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIncomingFollowRequestsKey,
    AccountDetailsRejectedFollowRequestsKey
} from "./shared/constants";
import APIGateway, {DefaultEventValues, EventFunctions} from "./shared/api-gateway";
import ThisAccount from "./daos/this-account";
import Dynamo from "./services/dynamo";
import TrackedAccounts from "./daos/tracked-accounts";
import SNS from "./services/sns";
import {FollowRequestCreateResponse, isFollowRequest, ReducedAccountDetails} from "@social-freedom/types";

type EventValues = DefaultEventValues & {
    isFollowing: boolean,
    isAccountPublic: boolean,
    thisAccountDetails: ReducedAccountDetails,
    hasPreviouslyRejectedRequest: boolean
}

export const handler = async (event: APIGatewayEvent): Promise<any> => {
    return await APIGateway.handleEvent(async () => {
        const eventValues: EventValues = await APIGateway.resolveEventValues(event, {
            isFollowing: EventFunctions.isFollowingRequestingUser,
            isAccountPublic: ThisAccount.isPublic,
            thisAccountDetails: ThisAccount.getDetails,
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
    return Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsRejectedFollowRequestsKey, EventFunctions.getUserId(event))
}

export const conditionalAutoRespond = async (eventValues: EventValues): Promise<FollowRequestCreateResponse> => {
    if (eventValues.hasPreviouslyRejectedRequest) {
        return {
            response: {
                accepted: false,
                accountDetails: eventValues.thisAccountDetails
            }
        }
    } else if (eventValues.isAccountPublic || eventValues.isFollowing) {
        await Promise.all([
            Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, eventValues.userId),
            Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, eventValues.userId),
            TrackedAccounts.put(eventValues.eventBody),
            SNS.subscribeToProfileEvents(eventValues.eventBody),
            SNS.subscribeToPostEvents(eventValues.eventBody)
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
        Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, eventValues.userId),
        TrackedAccounts.put(eventValues.eventBody),
        SNS.subscribeToProfileEvents(eventValues.eventBody)
    ])
    return {}
}