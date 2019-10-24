import {SNSEvent} from "aws-lambda";

export const handler = async (event:SNSEvent) => {
    // update TrackedAccounts table to reflect profile updates to tracked account
    // TODO

    event.Records.forEach(record => {
        // record.Sns.Message
    })
};