import * as AWS from "aws-sdk";
import {AWSError} from "aws-sdk";
import {AttributeMap, AttributeValueList, GetItemOutput} from "aws-sdk/clients/dynamodb";
import {PromiseResult} from "aws-sdk/lib/request";
import {APIGatewayEvent} from "aws-lambda";
import * as Util from "./shared/util";
import {InternalFollowResponse} from "./shared/follow-request-types";
import {AccountDetailsFollowRequestsKey} from "./shared/constants";
import {AccountDetails} from "../../../shared/account-types";

export const handler = async (event: APIGatewayEvent) => {
    Util.internalAPIIdentityCheck(event)

    const response: InternalFollowResponse = JSON.parse(event.body)
    await internalFollowRequestRespond(event.headers['Authorization'], response)
};

export const internalFollowRequestRespond = async (cognitoAuthToken: string, response: InternalFollowResponse) => {
    let doAttempt: boolean = true
    while (doAttempt) {
        doAttempt = false
        const followRequestsItem: PromiseResult<GetItemOutput, AWSError> = await new AWS.DynamoDB().getItem({
            TableName: process.env.ACCOUNT_DETAILS_TABLE,
            Key: {
                key: {S: AccountDetailsFollowRequestsKey}
            }
        }).promise()

        const followRequests: AttributeValueList = !!followRequestsItem.Item && !!followRequestsItem.Item['value'] &&
            followRequestsItem.Item['value'].L || []
        const requestIndex: number = followRequests.findIndex(r => {
            return r.M && r.M['id'] && r.M['id'].S === response.requestId
        })

        if (requestIndex !== -1) {
            const request: AttributeMap = followRequests[requestIndex].M || {}
            let myAccountDetails:AccountDetails
            if (response.accepted) {
                await new AWS.DynamoDB().putItem({
                    TableName: process.env.FOLLOWERS_TABLE,
                    Item: request
                }).promise()
                myAccountDetails = {
                    identifiers: {
                        cognitoIdentityId: process.env.COGNITO_IDENTITY_ID,
                        accountId: process.env.ACCOUNT_ID,
                        region: process.env.REGION,
                        userId: process.env.USER_ID,
                        apiDomainName: process.env.API_DOMAIN_NAME
                    },
                    profile: await Util.getProfile()
                }
            }

            const requestApiDomain: string = request["identifiers"].M["apiDomainName"].S
            await Util.apiRequest(requestApiDomain, '/follower/follow-request-response', cognitoAuthToken, 'POST', {
                accepted: response.accepted,
                accountDetails: myAccountDetails
            })

            // if this account isn't public and we're not already following, request to follow them
            if (response.accepted && !await Util.isAccountPublic() && !await Util.isFollowing(request["identifiers"].M["userId"].S)) {
                await Util.apiRequest(requestApiDomain, '/follower/follow-request-create',
                    cognitoAuthToken, 'POST', myAccountDetails)
            }

            // Remove the follow request from the list of received requests
            const version: string = !!followRequestsItem.Item && !!followRequestsItem.Item['version'] &&
                followRequestsItem.Item['version'].N || "0"
            try {
                await new AWS.DynamoDB().updateItem({
                    TableName: process.env.ACCOUNT_DETAILS_TABLE,
                    Key: {
                        key: {S: AccountDetailsFollowRequestsKey}
                    },
                    ConditionExpression: "#version = :version",
                    UpdateExpression: `REMOVE #value[:remove_index] ADD #version :version_inc`,
                    ExpressionAttributeNames: {
                        '#value': 'value',
                        '#version': 'version'
                    },
                    ExpressionAttributeValues: {
                        ':remove_index': {N: requestIndex.toString()},
                        ':version': {N: version}
                    }
                }).promise()
            } catch (e) {
                // if our ConditionExpression failed (race condition), then retry
                doAttempt = e.name === 'ConditionalCheckFailedException'
                if (!doAttempt) {
                    throw e
                }
            }
        }
    }
}