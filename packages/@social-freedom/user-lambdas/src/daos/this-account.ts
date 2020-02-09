import {Optional, Profile, ReducedAccountDetails} from "@social-freedom/types";
import {PromiseResult} from "aws-sdk/lib/request";
import {GetItemOutput} from "aws-sdk/clients/dynamodb";
import {AWSError} from "aws-sdk";
import {
    AccountDetailsFollowersKey,
    AccountDetailsFollowingKey,
    AccountDetailsIsPublicKey,
    AccountDetailsProfileKey
} from "../shared/constants";
import Dynamo from "../services/dynamo";
import SNS from "../services/sns";
import Helpers from "../shared/helpers";

function numberToDate(num: number): Date {
    return new Date(num)
}

const ThisAccount = {
    getDetails: async (): Promise<ReducedAccountDetails> => {
        return ThisAccount.buildDetails(await ThisAccount.getProfile())
    },

    buildDetails: (profile: Profile): ReducedAccountDetails => {
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

        return isAccountPublicItem?.Item?.['value']?.BOOL ?? false
    },

    getProfile: async (): Promise<Profile> => {
        const profileItem: PromiseResult<GetItemOutput, AWSError> = await Dynamo.client.getItem({
            TableName: process.env.ACCOUNT_DETAILS_TABLE,
            Key: {
                key: {S: AccountDetailsProfileKey}
            }
        }).promise()

        return Optional.of(profileItem?.Item?.['value']?.M).map<Profile>(value => ({
            name: value['name'].S,
            photoUrl: value['photoUrl']?.S,
            phone: value['phone']?.S,
            email: value['email']?.S,
            birthday: Optional.of(value['birthday']?.S).map(Date.parse).map(numberToDate).get()
        })).get()
    },

    putProfile: async (profile: Profile): Promise<void> => {
        await Promise.all([
            Dynamo.client.putItem({
                TableName: process.env.ACCOUNT_DETAILS_TABLE,
                Item: {
                    key: {S: AccountDetailsProfileKey},
                    name: Optional.of(profile['name']).map(Helpers.toDynamoString).get(),
                    photoUrl: Optional.of(profile['photoUrl']).map(Helpers.toDynamoString).get(),
                    phone: Optional.of(profile['phone']).map(Helpers.toDynamoString).get(),
                    email: Optional.of(profile['email']).map(Helpers.toDynamoString).get(),
                    birthday: Optional.of(profile['birthday']).map(birthday => birthday.toDateString())
                        .map(Helpers.toDynamoString).get()
                }
            }).promise(),
            SNS.client.publish({
                TopicArn: process.env.PROFILE_TOPIC,
                Message: JSON.stringify(ThisAccount.buildDetails(profile))
            })
        ])
    },

    isFollowedBy: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowersKey, userId)
    },

    isFollowing: async (userId: string): Promise<boolean> => {
        return process.env.USER_ID === userId || await Dynamo.isInSet(process.env.ACCOUNT_DETAILS_TABLE, AccountDetailsFollowingKey, userId)
    },
}

export default ThisAccount