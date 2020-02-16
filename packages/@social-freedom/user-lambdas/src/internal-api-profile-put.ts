import {APIGatewayEvent} from "aws-lambda";
import APIGateway from "./shared/api-gateway";
import ThisAccount from "./daos/this-account";
import {isProfile} from "@social-freedom/types";

export const handler = async (event: APIGatewayEvent) => {
    return await APIGateway.handleEvent(async () => {
        await APIGateway.internalAPIIdentityCheck(event)

        const profile = JSON.parse(event.body)
        if (isProfile(profile)) {
            await ThisAccount.putProfile(profile)
        }
    })
};