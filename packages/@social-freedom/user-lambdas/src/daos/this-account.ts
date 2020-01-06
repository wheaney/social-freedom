import {Profile, ReducedAccountDetails} from "@social-freedom/types";
import {PromiseResult} from "aws-sdk/lib/request";
import {GetItemOutput} from "aws-sdk/clients/dynamodb";
import {AWSError} from "aws-sdk";
import {AccountDetailsFollowersKey, AccountDetailsFollowingKey, AccountDetailsIsPublicKey} from "src/shared/constants";
import Dynamo from "src/services/dynamo";

const ThisAccount = {
    getDetails: async (): Promise<ReducedAccountDetails> => {
        const profile = await ThisAccount.getProfile()
        return {
            userId: process.env.USER_ID,
            apiOrigin: process.env.API_ORIGIN,
            postsTopicArn: process.env.POSTS_TOPIC,
            profileTopicArn: process.env.PROFILE_TOPIC,
            name: profile.name,
            photoUrl: profile.photoUrl
        }
    },

    isPublic: async (): Promise<boolean> => {
        const isAccountPublicItem: PromiseResult<GetItemOutput, AWSError> = await Dynamo.client.getItem({
            TableName: process.env.ACCOUNT_DETAILS_TABLE,
            Key: {
                key: {S: AccountDetailsIsPublicKey}
            }
        }).promise()

        return !!isAccountPublicItem.Item && !!isAccountPublicItem.Item['value'] &&
            !!isAccountPublicItem.Item['value'].BOOL
    },

    getProfile: async (): Promise<Profile> => {
        // TODO

        return {
            name: "Testy McTesterson"
        } as Profile
    },

    isFollowedBy: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, userId)
    },

    isFollowing: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, userId)
    },
}

export default ThisAccount