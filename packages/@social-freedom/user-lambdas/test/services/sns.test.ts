import {createAWSMock, FollowingAccountDetails, setAWSMock, setupEnvironmentVariables} from "../test-utils";
import {SubscribeResponse} from "aws-sdk/clients/sns";
import SNS from "../../src/services/sns";

let subscribeMock = createAWSMock<SubscribeResponse>(SNS.client, 'subscribe')
setAWSMock(subscribeMock, Promise.resolve())

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