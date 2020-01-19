import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import ThisAccount from "./daos/this-account";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.handleEvent(async () => {
        await APIGateway.followerAPIIdentityCheck(event)

        return await ThisAccount.getProfile()
    })
}