import {createAWSMock, FollowingAccountDetails, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import {SubscribeResponse} from "aws-sdk/clients/sns";
import SNS from "../../src/services/sns";

let subscribeMock = createAWSMock<SubscribeResponse>(SNS.client, 'subscribe')

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    setAWSMock(subscribeMock, Promise.resolve())
    done()
});

describe("subscribeToProfileEvents", () => {
    it("should make a subscribe request to SNS", async () => {
        await SNS.subscribeToProfileEvents(FollowingAccountDetails)

        expect(subscribeMock).toHaveBeenCalledWith({
            TopicArn: 'profileTopicArn',
            Endpoint: 'profileEventsHandlerArn',
            Protocol: 'lambda'
        })
    })
})

describe("subscribeToPostEvents", () => {
    it("should make a subscribe request to SNS", async () => {
        await SNS.subscribeToPostEvents(FollowingAccountDetails)

        expect(subscribeMock).toHaveBeenCalledWith({
            TopicArn: 'postsTopicArn',
            Endpoint: 'postEventsHandlerArn',
            Protocol: 'lambda'
        })
    })
})