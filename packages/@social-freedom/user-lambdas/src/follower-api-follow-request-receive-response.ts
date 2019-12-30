import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequestResponse} from "@social-freedom/types"
import {
    AccountDetailsFollowingKey,
    AccountDetailsOutgoingFollowRequestsKey
} from "./shared/constants";
import {getUserId} from "./shared/api-gateway-event-functions";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues = await Util.resolveEventValues(event, {
            requestExists: requestExists
        })
        if (!eventValues.requestExists) {
            throw new Error(`Unauthorized userId: ${eventValues.userId}`)
        }

        if (isAFollowRequestResponse(eventValues.eventBody)) {
            await followRequestReceiveResponse(eventValues.eventBody)
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

export const followRequestReceiveResponse = async (response: FollowRequestResponse) => {
    // TODO - verify response account details

    const promises = [Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, response.accountDetails.userId)]
    if (response.accepted) {
        promises.push(
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, response.accountDetails.userId),
            Util.putTrackedAccount(response.accountDetails),
            Util.subscribeToProfileEvents(response.accountDetails),
            Util.subscribeToPostEvents(response.accountDetails)
        )
    }

    return Promise.all(promises)
}