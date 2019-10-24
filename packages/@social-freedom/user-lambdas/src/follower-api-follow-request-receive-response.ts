import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequestResponse} from "@social-freedom/types"
import {AccountDetailsFollowingKey, AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";

export const handler = async (event:APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        await Util.followerAPIIdentityCheck(event)

        const response: FollowRequestResponse = JSON.parse(event.body)
        response.accountDetails = {
            ...response.accountDetails,
            userId: Util.getUserId(event)
        }
        await followRequestReceiveResponse(response)
    })
}

export const followRequestReceiveResponse = async (response: FollowRequestResponse) => {
    await Util.removeFromDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, response.accountDetails.userId)

    if (response.accepted) {
        await Promise.all([
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, response.accountDetails.userId),
            Util.putTrackedAccount(response.accountDetails),
            Util.subscribeToProfileEvents(response.accountDetails),
            Util.subscribeToPostEvents(response.accountDetails)
        ])
    }
}