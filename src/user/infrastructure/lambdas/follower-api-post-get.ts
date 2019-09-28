import {followerAPIIdentityCheck} from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
    await followerAPIIdentityCheck(event)

    return {
        status: 200
    }
}