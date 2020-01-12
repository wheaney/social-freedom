import {AttributeMap} from "aws-sdk/clients/dynamodb";
import {ReducedAccountDetails, UserDetails} from "@social-freedom/types";
import Dynamo from "../services/dynamo";

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
                photoUrl: !!trackedAccount.photoUrl ? {S: trackedAccount.photoUrl} : undefined
            }
        }).promise()
    },

    get: async (userId: string): Promise<ReducedAccountDetails> => {
        const requesterDetailsItem = (await Dynamo.client.getItem({
            TableName: process.env.TRACKED_ACCOUNTS_TABLE,
            Key: {
                userId: {S: userId}
            }
        }).promise()).Item

        if (!!requesterDetailsItem) {
            return {
                userId: requesterDetailsItem['userId'].S,
                apiOrigin: requesterDetailsItem['apiOrigin'].S,
                postsTopicArn: requesterDetailsItem['postsTopicArn'].S,
                profileTopicArn: requesterDetailsItem['profileTopicArn'].S,
                name: requesterDetailsItem['name'].S,
                photoUrl: requesterDetailsItem['photoUrl'] ? requesterDetailsItem['photoUrl'].S : undefined
            }
        } else {
            return undefined
        }
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

            return usersResult.Responses[process.env.TRACKED_ACCOUNTS_TABLE].reduce((acc: UserDetails, current: AttributeMap) => {
                const accountDetails = {
                    userId: current['userId'].S,
                    apiOrigin: current['apiOrigin'].S,
                    postsTopicArn: current['postsTopicArn'].S,
                    profileTopicArn: current['profileTopicArn'].S,
                    name: current['name'].S,
                    photoUrl: current['photoUrl'] ? current['photoUrl'].S : undefined
                }
                acc[accountDetails.userId] = accountDetails

                return acc
            }, {})
        }

        return {}
    }
}

export default TrackedAccounts