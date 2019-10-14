import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "@social-freedom/types";
import {internalFollowRequestRespond} from './internal-api-follow-request-respond'
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";

export const handler = async (event: APIGatewayEvent): Promise<any> => {
    return await Util.apiGatewayProxyWrapper(async () => {
        await followRequestCreate(Util.getAuthToken(event), {
            ...JSON.parse(event.body),
            userId: Util.getUserId(event)
        })
    })
};

// visible for testing
export const followRequestCreate = async (cognitoAuthToken: string, request:FollowRequest): Promise<void> => {
    /**
     * TODO - validate that userId of requester matches other account details,
     *        via call to Federal stack
     */

    await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, request.userId)
    await Util.putTrackedAccountDetails(request)
    await Util.subscribeToProfileUpdates(request)

    // TODO - implement auto-denied condition (e.g. blocked account)
    const autoDenied = false
    if (autoDenied) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            userId: request.userId,
            accepted: false
        })
    } else if (await Util.isAccountPublic()) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            userId: request.userId,
            accepted: true
        })
    }
}