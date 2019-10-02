import * as Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "./shared/follow-request-types";
import {AccountDetails} from "../../../shared/account-types";
import {AccountDetailsOutgoingFollowRequestsKey} from "./shared/constants";

export const handler = async (event:APIGatewayEvent) => {
    Util.internalAPIIdentityCheck(event)

    await internalFollowRequestCreate(Util.getAuthToken(event), JSON.parse(event.body))

    return Util.apiGatewayLambdaResponse()
}

export const internalFollowRequestCreate = async (cognitoAuthToken: string, request: FollowRequest, thisAccountDetails?: AccountDetails) => {
    await Util.addToDynamoSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsOutgoingFollowRequestsKey, request.userId)

    await Util.apiRequest(request.identifiers.apiDomainName, '/follower/follow-request-create',
        cognitoAuthToken, 'POST', thisAccountDetails || await Util.getThisAccountDetails())
}