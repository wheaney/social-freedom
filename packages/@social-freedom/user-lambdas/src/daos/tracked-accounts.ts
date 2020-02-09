import {AttributeMap} from "aws-sdk/clients/dynamodb";
import {isReducedAccountDetails, Optional, ReducedAccountDetails, UserDetails} from "@social-freedom/types";
import Dynamo from "../services/dynamo";
import Helpers from "../shared/helpers";

const TrackedAccounts = {
    put: async (trackedAccount: ReducedAccountDetails) => {
        await Dynamo.client.putItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Item: {
                userId: {S: trackedAccount.userId},
                apiOrigin: {S: trackedAccount.apiOrigin},
                postsTopicArn: {S: trackedAccount.postsTopicArn},
                profileTopicArn: {S: trackedAccount.profileTopicArn},
                name: {S: trackedAccount.name},
                photoUrl: Optional.of(trackedAccount.photoUrl).map(Helpers.toDynamoString).get()
            }
        }).promise()
    },

    attributeMapToTrackedAccount: (map: AttributeMap): ReducedAccountDetails => {
        const trackedAccount = {
            userId: map?.['userId']?.S,
            apiOrigin: map?.['apiOrigin']?.S,
            postsTopicArn: map?.['postsTopicArn']?.S,
            profileTopicArn: map?.['profileTopicArn']?.S,
            name: map?.['name']?.S,
            photoUrl: map?.['photoUrl']?.S
        }
        if (isReducedAccountDetails(trackedAccount)) {
            return trackedAccount
        }

        return undefined
    },

    get: async (userId: string): Promise<ReducedAccountDetails> => {
        const requesterDetailsItem = (await Dynamo.client.getItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Key: {
                userId: {S: userId}
            }
        }).promise())

        return Optional.of(requesterDetailsItem?.Item).map(TrackedAccounts.attributeMapToTrackedAccount).get()
    },

    getAll: async (userIds: string[], excludeIds: string[] = []):Promise<UserDetails> => {
        const uniqueUserIds = [...new Set(userIds.filter(userId => !excludeIds.includes(userId)))]
        if (uniqueUserIds.length) {
            const usersResult = await Dynamo.client.batchGetItem({
                RequestItems: {
                    [process.env.TRACKED_ACCOUNTS_TABLE]: {
                        Keys: uniqueUserIds.map(userId => ({
                            userId: {S: userId}
                        }))
                    }
                }
            }).promise()

            return usersResult?.Responses?.[process.env.TRACKED_ACCOUNTS_TABLE]?.reduce((acc: UserDetails, current: AttributeMap) => {
                const accountDetails = TrackedAccounts.attributeMapToTrackedAccount(current)
                acc[accountDetails.userId] = accountDetails

                return acc
            }, {}) ?? {}
        }

        return {}
    }
}

export default TrackedAccounts