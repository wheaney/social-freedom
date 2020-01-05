import * as AWSMock from "aws-sdk-mock";
import {SubscribeInput} from "aws-sdk/clients/sns";
import Util from "../../src/shared/util";
import {FollowingAccountDetails, FollowingAccountDetailsFull, setupEnvironmentVariables} from "../test-utils";
import * as AWS from "aws-sdk";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    AWSMock.setSDKInstance(AWS);
    done()
})

describe("the subscribeToProfileUpdates function", () => {
    it("should make a subscribe request to SNS", async () => {
        AWSMock.mock('SNS', 'subscribe', (params: SubscribeInput, callback: Function) => {
            expect(params).toStrictEqual({
                TopicArn: 'profileTopicArn',
                Endpoint: 'profileEventsHandlerArn',
                Protocol: 'lambda'
            })

            callback(null, {});
        })

        await Util.subscribeToProfileEvents(FollowingAccountDetails)

        AWSMock.restore('SNS')
    })
})

describe("the getThisAccountDetails function", () => {
    it("should return reduced account details for this account", async () => {
        const mockedGetProfile = jest.spyOn(Util, 'getProfile')
        mockedGetProfile.mockResolvedValue(FollowingAccountDetailsFull.profile)

        const thisAccountDetails = await Util.getThisAccountDetails()
        expect(thisAccountDetails).toStrictEqual({
            userId: "thisUserId",
            apiOrigin: "myApiDomain.com",
            name: "Following User",
            photoUrl: "followingUserPhoto",
            postsTopicArn: "postsTopic",
            profileTopicArn: "profileTopic"
        })

        expect(mockedGetProfile).toHaveBeenCalled()
    })
})