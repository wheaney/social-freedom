import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import {FollowRequestsRequest, FollowRequestsResponse} from "@social-freedom/types";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        const params = event.queryStringParameters
        return await followRequestsGet(params ? {
            cachedUsers: params['cachedUsers'] && params['cachedUsers'].split(",") || []
        } : {})
    })
}

// visible for testing
export const followRequestsGet = async (request: FollowRequestsRequest): Promise<FollowRequestsResponse> => {
    const requests = await Util.getDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey)

    return {
        userIds: requests,
        users: await Util.usersRequest(request.cachedUsers, requests)
    }
}