import Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
    return await Util.apiGatewayProxyWrapper(async () => {
        await Util.followerAPIIdentityCheck(event)
    })
}