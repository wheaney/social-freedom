import * as Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
    await Util.apiGatewayProxyWrapper(async () => {
        await Util.followerAPIIdentityCheck(event)

        return await Util.getProfile()
    })
}