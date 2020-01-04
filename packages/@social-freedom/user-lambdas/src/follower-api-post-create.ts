import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        await APIGateway.followerAPIIdentityCheck(event)
    })
}