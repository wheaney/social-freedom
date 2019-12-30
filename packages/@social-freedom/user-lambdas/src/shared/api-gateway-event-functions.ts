import {APIGatewayEvent} from "aws-lambda";
import {AuthTokenHeaderName} from "./constants";
import Util from "./util";

export function getUserId(event: APIGatewayEvent) {
    return event.requestContext.authorizer.claims.sub
}

export function getAuthToken(event: APIGatewayEvent) {
    return event.headers[AuthTokenHeaderName]
}

export async function isFollowingRequestingUser(event: APIGatewayEvent) {
    return Util.isFollowing(getUserId(event))
}

export async function cachedUsers(event: APIGatewayEvent) {
    const params = event.queryStringParameters

    return params && params['cachedUsers'] && params['cachedUsers'].split(",") || []
}