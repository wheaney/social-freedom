import * as AWS from "aws-sdk";
import {APIRequestMessage} from "@social-freedom/types";

const SQS = {
    client: new AWS.SQS(),

    sendAPIRequestMessage: async (message: APIRequestMessage) => {
        await SQS.client.sendMessage({
            QueueUrl: process.env.API_REQUESTS_QUEUE_URL,
            MessageGroupId: 'api-requests',
            MessageBody: JSON.stringify(message)
        }).promise()
    }
}

export default SQS