import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "@social-freedom/types";
import {internalFollowRequestRespond} from './internal-api-follow-request-respond'
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";

export const handler = async (event: APIGatewayEvent): Promise<any> => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const followRequest: FollowRequest = {
            ...JSON.parse(event.body),
            userId: Util.getUserId(event)
        }

        /**
         * TODO - validate that userId of requester matches other account details
         */

        await Promise.all([
            Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, followRequest.userId),
            Util.putTrackedAccount(followRequest),
            Util.subscribeToProfileEvents(followRequest),
            conditionalAutoRespond(Util.getAuthToken(event), followRequest.userId)
        ])
    })
};

export const conditionalAutoRespond = async (cognitoAuthToken: string, userId: string) => {
    // TODO - implement auto-denied condition (e.g. blocked account)
    const autoDenied = false
    if (autoDenied) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            userId: userId,
            accepted: false
        })
    } else if (await Util.isAccountPublic() || await Util.isFollowing(userId)) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            userId: userId,
            accepted: true
        })
    }
}