import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";
import {asyncFollowRequestCreate} from "./shared/follow-requests";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        const eventValues = await Util.internalAPIIdentityCheck(event)

        await asyncFollowRequestCreate(eventValues.authToken, eventValues.eventBody)
    })
}