import * as AWS from "aws-sdk";
import {ReducedAccountDetails} from "@social-freedom/types";

const SNS = {
    client: new AWS.SNS(),

    subscribeToProfileEvents: async (account: ReducedAccountDetails) => {
        await SNS.client.subscribe({
            TopicArn: account.profileTopicArn,
            Endpoint: process.env.PROFILE_EVENTS_HANDLER,
            Protocol: 'lambda'
        }).promise()
    },

    subscribeToPostEvents: async (account: ReducedAccountDetails) => {
        await SNS.client.subscribe({
            TopicArn: account.postsTopicArn,
            Endpoint: process.env.POST_EVENTS_HANDLER,
            Protocol: 'lambda'
        }).promise()
    },
}

export default SNS;