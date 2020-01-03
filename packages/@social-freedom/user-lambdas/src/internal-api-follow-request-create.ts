import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "@social-freedom/types";
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues = await Util.internalAPIIdentityCheck(event)

        await internalFollowRequestCreate(eventValues.authToken, eventValues.eventBody)
    })
}

// visible for testing
export const internalFollowRequestCreate = async (cognitoAuthToken: string, followRequest: FollowRequest) => {
    await Promise.all([
        Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, followRequest.userId),
        Util.putTrackedAccount(followRequest),
        Util.queueAPIRequest(process.env.API_ORIGIN, 'internal/async/follow-requests',
            cognitoAuthToken, 'POST', followRequest)
    ])
}