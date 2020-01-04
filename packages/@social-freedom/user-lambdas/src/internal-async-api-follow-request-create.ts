import APIGateway from "./shared/api-gateway";
import {APIGatewayEvent} from "aws-lambda";
import {asyncFollowRequestCreate} from "./shared/follow-requests";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.proxyWrapper(async () => {
        const eventValues = await APIGateway.internalAPIIdentityCheck(event)

        await asyncFollowRequestCreate(eventValues.authToken, eventValues.eventBody)
    })
}