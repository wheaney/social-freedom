import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequestResponse} from "@social-freedom/types"
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";
import {getUserId} from "./shared/api-gateway-event-functions";
import {handleFollowRequestResponse} from "./shared/follow-requests";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues = await Util.resolveEventValues(event, {
            requestExists: requestExists
        })

        // TODO - make this handle retries with a no-op
        //        we'll need to store follow rejections for this to work better
        if (!eventValues.requestExists) {
            throw new Error(`Unauthorized userId: ${eventValues.userId}`)
        }

        if (isAFollowRequestResponse(eventValues.eventBody)) {
            await handleFollowRequestResponse(eventValues.eventBody)
        }
    })
}

// TODO - replace with generic type checker, could use something like ts-transformer-keys module
export function isAFollowRequestResponse(object: any): object is FollowRequestResponse {
    if (Util.isNotNullish(object.accepted) && (!object.accepted || Util.isNotNullish(object.accountDetails))) {
        return true
    }

    throw new Error(`Invalid FollowRequestResponse: ${JSON.stringify(object)}`)
}

export async function requestExists(event: APIGatewayEvent, request: any) {
    if (isAFollowRequestResponse(request)) {
        return Util.dynamoSetContains(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, getUserId(event))
    }

    return undefined
}