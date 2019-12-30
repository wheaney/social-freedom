import Util, {DefaultEventValues} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import {FollowRequestsResponse} from "@social-freedom/types";
import {cachedUsers} from "./shared/api-gateway-event-functions";

type EventValues = DefaultEventValues & {
    cachedUsers: string[],
    incomingFollowRequests: string[]
}

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues: EventValues = await Util.internalAPIIdentityCheck(event, {
            cachedUsers: cachedUsers,
            incomingFollowRequests: incomingFollowRequests
        })

        return await followRequestsGet(eventValues)
    })
}

export async function incomingFollowRequests() {
    return Util.getDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey)
}

// visible for testing
export const followRequestsGet = async (eventValues: EventValues): Promise<FollowRequestsResponse> => {
    return {
        userIds: eventValues.incomingFollowRequests,
        users: await Util.usersRequest(eventValues.cachedUsers, eventValues.incomingFollowRequests)
    }
}