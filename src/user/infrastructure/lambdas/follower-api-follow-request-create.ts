import * as Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "./shared/follow-request-types";
import {internalFollowRequestRespond} from './internal-api-follow-request-respond'
import {AccountDetailsIncomingFollowRequestsKey} from "./shared/constants";
import * as AWS from "aws-sdk";

export const handler = async (event: APIGatewayEvent): Promise<void> => {
    await Util.followerAPIIdentityCheck(event)

    return await followRequestCreate(Util.getAuthToken(event), {
        userId: event.requestContext.identity.cognitoIdentityId,
        ...JSON.parse(event.body)
    })
};

// visible for testing
export const followRequestCreate = async (cognitoAuthToken: string, request:FollowRequest): Promise<void> => {
    /**
     * TODO - validate that cognitoIdentityId of requestor matches follow request data,
     *        via call to Federal stack
     */

    await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsIncomingFollowRequestsKey, request.userId)

    // subscribe to their topic so our request details are always up-to-date
    const identifiers = request.identifiers
    await new AWS.SNS().subscribe({
        TopicArn: `arn:aws:sns:${identifiers.region}:${identifiers.accountId}:ProfileUpdates-${request.userId}`,
        Endpoint: process.env.PROFILE_UPDATE_HANDLER,
        Protocol: 'lambda'
    }).promise()

    await Util.putTrackedAccountDetails(request)

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