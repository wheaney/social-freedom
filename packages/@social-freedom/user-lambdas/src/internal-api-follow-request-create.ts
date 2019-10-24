import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest, ReducedAccountDetails} from "@social-freedom/types";
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        await internalFollowRequestCreate(Util.getAuthToken(event), JSON.parse(event.body))
    })
}

export const internalFollowRequestCreate = async (cognitoAuthToken: string, request: FollowRequest, thisAccountDetails?: ReducedAccountDetails) => {
    await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, request.userId)

    // we can't subscribe to profile updates yet, but we can at least store what we know about this account
    await Util.putTrackedAccount(request)

    await Util.apiRequest(request.apiOrigin, '/follower/follow-request-create',
        cognitoAuthToken, 'POST', thisAccountDetails || await Util.getThisAccountDetails())
}