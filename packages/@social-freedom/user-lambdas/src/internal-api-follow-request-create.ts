import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "@social-freedom/types";
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        Util.internalAPIIdentityCheck(event)

        await internalFollowRequestCreate(Util.getAuthToken(event), JSON.parse(event.body))
    })
}

// visible for testing
export const internalFollowRequestCreate = async (cognitoAuthToken: string, followRequest: FollowRequest) => {
    await Promise.all([
        Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, followRequest.userId),
        Util.putTrackedAccount(followRequest),
        Util.apiRequest(followRequest.apiOrigin, 'follower/follow-request',
            cognitoAuthToken, 'POST',  await Util.getThisAccountDetails())
    ])
}