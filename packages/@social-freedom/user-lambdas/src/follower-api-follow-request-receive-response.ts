import Util from "./shared/util";
import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {isFollowRequestResponse} from "@social-freedom/types"
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";
import {getUserId} from "./shared/api-gateway-event-functions";
import {handleFollowRequestResponse} from "./shared/follow-requests";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues = await APIGateway.resolveEventValues(event, {
            requestExists: requestExists
        })

        // TODO - make this handle retries with a no-op
        //        we'll need to store follow rejections for this to work better
        if (!eventValues.requestExists) {
            throw new Error(`Unauthorized userId: ${eventValues.userId}`)
        }

        if (isFollowRequestResponse(eventValues.eventBody)) {
            await handleFollowRequestResponse(eventValues.eventBody)
        }
    })
}

export async function requestExists(event: APIGatewayEvent, request: any) {
    if (isFollowRequestResponse(request)) {
        return Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, getUserId(event))
    }

    return undefined
}