import * as AWS from "aws-sdk"
import {AsyncAPIRequest} from "@social-freedom/types";

const Lambda = {
    client: new AWS.Lambda(),

    triggerAsyncAPIRequest: async (request: AsyncAPIRequest) => {
        await Lambda.client.invoke({
            InvocationType: 'Event',
            FunctionName: process.env.ASYNC_API_REQUEST_HANDLER,
            Payload: JSON.stringify(request)
        }).promise()
    }
}

export default Lambda