import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import ThisAccount from "src/daos/this-account";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        await APIGateway.followerAPIIdentityCheck(event)

        return await ThisAccount.getProfile()
    })
}