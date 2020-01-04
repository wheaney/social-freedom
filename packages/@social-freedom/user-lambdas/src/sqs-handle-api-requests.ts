import {SQSEvent} from "aws-lambda";
import Util from "./shared/util";
import {isAPIRequestMessage} from "@social-freedom/types";


export const handler = async (event:SQSEvent) => {
    for (let record of event.Records) {
        const request = JSON.parse(record.body)
        if (isAPIRequestMessage(request)) {
            await Util.apiRequest(request.origin, request.path, request.authToken, request.requestMethod, request.requestBody)
        }
    }
}