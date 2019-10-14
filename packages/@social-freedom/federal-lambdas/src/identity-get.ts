import {APIGatewayEvent} from "aws-lambda";
import Util from "./shared/util";
import * as AWS from 'aws-sdk'
import {AuthDetails} from "@social-freedom/types";

export const handler = async (event:APIGatewayEvent) => {
    return Util.apiGatewayProxyWrapper(async () => {
        const claim = event.requestContext.authorizer.claims
        const identifiers = await getAccountIdentifiers(Util.getUserId(event))
        const isRegistered = !!identifiers && !!identifiers['apiOrigin'] && !!identifiers['apiOrigin'].S
        return {
            isAuthenticated: true,
            identity: {
                id: claim.sub,
                authTime: claim.auth_time,
                email: claim.email,
                username: claim['cognito:username'],
                expiration: claim.exp
            },
            isRegistered: isRegistered,
            accountIdentifiers: {
                accountId: !!identifiers && !!identifiers['accountId'] ? identifiers['accountId'].S : undefined,
                region: !!identifiers && !!identifiers['region'] ? identifiers['region'].S : undefined,
                apiOrigin: !!identifiers && !!identifiers['apiOrigin'] ? identifiers['apiOrigin'].S : undefined
            }
        } as AuthDetails
    })
};

export const getAccountIdentifiers = async (userId: string) => {
    const accountResponse = await new AWS.DynamoDB().getItem({
        TableName: process.env.ACCOUNTS_TABLE,
        Key: {
            userId: {S: userId}
        }
    }).promise()

    return accountResponse.Item
}