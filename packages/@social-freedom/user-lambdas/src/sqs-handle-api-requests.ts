import {SQSEvent} from "aws-lambda";
import {APIRequestMessage} from "@social-freedom/types";
import Util from "./shared/util";


export const handler = async (event:SQSEvent) => {
    for (let record of event.Records) {
        const request = JSON.parse(record.body)
        if (isAPIRequestMessage(request)) {
            await Util.apiRequest(request.origin, request.path, request.authToken, request.requestMethod, request.requestBody)
        }
    }
}

function isAPIRequestMessage(object: any): object is APIRequestMessage {
    if (Util.hasAllFields(object, ['origin', 'path', 'authToken', 'requestMethod'])) {
        return true
    }

    throw new Error(`Invalid APIRequestMessage: ${object}`)
}