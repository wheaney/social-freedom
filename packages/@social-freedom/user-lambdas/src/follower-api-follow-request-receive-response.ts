import APIGateway, {EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {isFollowRequestResponse} from "@social-freedom/types"
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";
import {handleFollowRequestResponse} from "./shared/follow-requests";
import Dynamo from "./services/dynamo";

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
        return Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, EventFunctions.getUserId(event))
    }

    return undefined
}