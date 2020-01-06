import APIGateway, {DefaultEventValues, EventFunctions} from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import {FollowRequestsResponse} from "@social-freedom/types";
import Dynamo from "src/services/dynamo";
import TrackedAccounts from "src/daos/tracked-accounts";

type EventValues = DefaultEventValues & {
    cachedUsers: string[],
    incomingFollowRequests: string[]
}

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues: EventValues = await APIGateway.internalAPIIdentityCheck(event, {
            cachedUsers: EventFunctions.cachedUsers,
            incomingFollowRequests: incomingFollowRequests
        })

        return await followRequestsGet(eventValues)
    })
}

export async function incomingFollowRequests() {
    return Dynamo.getAllInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey)
}

// visible for testing
export const followRequestsGet = async (eventValues: EventValues): Promise<FollowRequestsResponse> => {
    return {
        userIds: eventValues.incomingFollowRequests,
        users: await TrackedAccounts.getAll(eventValues.incomingFollowRequests, eventValues.cachedUsers)
    }
}