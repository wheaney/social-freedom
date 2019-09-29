import * as AWS from "aws-sdk";
import * as uuid from "uuid";
import {followerAPIIdentityCheck, isAccountPublic} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {FollowRequest} from "./shared/follow-request-types";
import {internalFollowRequestRespond} from './internal-api-follow-request-respond'
import {AccountDetailsFollowRequestsKey} from "./shared/constants";

export const handler = async (event: APIGatewayEvent): Promise<void> => {
    await followerAPIIdentityCheck(event)

    return await followRequestCreate(event.headers['Authorization'], JSON.parse(event.body))
};

// visible for testing
export const followRequestCreate = async (cognitoAuthToken: string, request:FollowRequest): Promise<void> => {
    /**
     * TODO - validate that cognitoIdentityId of requestor matches follow request data,
     *        via call to Federal stack
     */

    // store the follow request
    const requestId = uuid.v1()
    await new AWS.DynamoDB().updateItem({
        TableName: process.env.ACCOUNT_DETAILS_TABLE,
        Key: {
            key: {S: AccountDetailsFollowRequestsKey}
        },
        UpdateExpression: `SET #value = list_append(if_not_exists(#value, :empty_list), :append_value) ADD #version :version_inc`,
        ExpressionAttributeNames: {
            '#value': 'value',
            '#version': 'version'
        },
        ExpressionAttributeValues: {
            ':empty_list': {L: []},
            ':append_value': {
                L: [{
                    M: {
                        id: {S: requestId},
                        identifiers: {
                            M: {
                                cognitoIdentityId: {S: request.identifiers.cognitoIdentityId},
                                accountId: {S: request.identifiers.accountId},
                                region: {S: request.identifiers.region},
                                userId: {S: request.identifiers.userId},
                                apiDomainName: {S: request.identifiers.apiDomainName},
                                creationDate: {N: Date.now().toString()}
                            }
                        },
                        profile: {S: JSON.stringify(request.profile)}
                    }
                }]
            },
            ':version_inc': {N: "1"}
        }
    }).promise()

    // TODO - implement auto-denied condition (e.g. blocked account)
    const autoDenied = false
    if (autoDenied) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            requestId: requestId,
            accepted: false
        })
    } else if (await isAccountPublic()) {
        await internalFollowRequestRespond(cognitoAuthToken, {
            requestId: requestId,
            accepted: true
        })
    }
}