import {FollowingAccountDetails, setupEnvironmentVariables} from "../test-utils";
import {AWSError, Request} from "aws-sdk";
import {SubscribeResponse} from "aws-sdk/clients/sns";
import SNS from "../../src/services/sns";
import {PromiseResult} from "aws-sdk/lib/request";

let subscribeMock: jest.SpyInstance<Request<SubscribeResponse, AWSError>> = jest.spyOn(SNS.client, 'subscribe')
subscribeMock.mockReturnValue({
    promise: () => Promise.resolve() as unknown as Promise<PromiseResult<SubscribeResponse, AWSError>>
} as unknown as Request<SubscribeResponse, AWSError>)

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
});

describe("the subscribeToProfileUpdates function", () => {
    it("should make a subscribe request to SNS", async () => {
        await SNS.subscribeToProfileEvents(FollowingAccountDetails)

        expect(subscribeMock).toHaveBeenCalledWith({
            TopicArn: 'profileTopicArn',
            Endpoint: 'profileEventsHandlerArn',
            Protocol: 'lambda'
        })
    })
})