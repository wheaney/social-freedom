import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "@social-freedom/types";
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";
import Dynamo from "./services/dynamo";
import TrackedAccounts from "./daos/tracked-accounts";
import UserAPI from "./services/user-api";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues = await APIGateway.internalAPIIdentityCheck(event)

        await internalFollowRequestCreate(eventValues.authToken, eventValues.eventBody)
    })
}

// visible for testing
export const internalFollowRequestCreate = async (cognitoAuthToken: string, followRequest: FollowRequest) => {
    await Promise.all([
        Dynamo.addToSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, followRequest.userId),
        TrackedAccounts.put(followRequest),
        UserAPI.queueRequest(process.env.API_ORIGIN, 'internal/async/follow-requests',
            cognitoAuthToken, 'POST', followRequest)
    ])
}