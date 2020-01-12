import {SQSEvent} from "aws-lambda";
import {isAPIRequestMessage} from "@social-freedom/types";
import UserAPI from "./services/user-api";


export const handler = async (event:SQSEvent) => {
    for (let record of event.Records) {
        const request = JSON.parse(record.body)
        if (isAPIRequestMessage(request)) {
            await UserAPI.request(request.origin, request.path, request.authToken, request.requestMethod, request.requestBody)
        }
    }
}