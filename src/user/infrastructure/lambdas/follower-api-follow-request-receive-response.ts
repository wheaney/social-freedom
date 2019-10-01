import * as Util from "./shared/util";
import {APIGatewayEvent} from "aws-lambda";

export const handler = async (event:APIGatewayEvent) => {
    await Util.followerAPIIdentityCheck(event)

    // TODO - if accepted, clear pending flag on Following entry, subscribe to account SNS topics
    //        update cached profile information (maybe received in the response payload)

    // TODO - if denied, delete Following entry
}