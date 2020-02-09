import {SNSEvent} from "aws-lambda";
import ThisAccount from "./daos/this-account";
import TrackedAccounts from "./daos/tracked-accounts";
import {isReducedAccountDetails, ReducedAccountDetails} from "@social-freedom/types";

export const handler = async (event:SNSEvent) => {
    await Promise.all(event.Records.map(async (record) => {
        const accountDetails = JSON.parse(record.Sns.Message)
        if (isReducedAccountDetails(accountDetails) && await isValidAndRelevant(accountDetails, record.Sns.TopicArn)) {
            await TrackedAccounts.put(accountDetails)
        }
    }))
};

export const isValidAndRelevant = async (accountDetails: ReducedAccountDetails, eventTopicArn: string) => {
    // we only care about a post if we follow the account that triggered it
    if (await ThisAccount.isFollowing(accountDetails.userId)) {
        // check that this came from an expected profile topic ARN
        const storedAccountDetails = await TrackedAccounts.get(accountDetails.userId)
        return storedAccountDetails?.profileTopicArn === eventTopicArn

        // TODO - verify signature
    }

    return false
}