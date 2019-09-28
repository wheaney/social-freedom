import {internalAPIIdentityCheck} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event:APIGatewayEvent) => {
    internalAPIIdentityCheck(event)

    // TODO - add entry to Following table with pending flag

    // TODO - call follower-api-follow-request-create API on account we're requesting to
}