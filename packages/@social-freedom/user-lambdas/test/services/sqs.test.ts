import {createAWSMock, setAWSMock, setupEnvironmentVariables, TestAPIRequestMessage} from "../test-utils";
import SQS from "../../src/services/sqs";

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
});

describe('sendAPIRequestMesssage', () => {
    it('should pass the message through to SQS.sendMessage', async () => {
        const sendMessageMock = createAWSMock(SQS.client, 'sendMessage')
        setAWSMock(sendMessageMock, Promise.resolve())

        await SQS.sendAPIRequestMessage(TestAPIRequestMessage)

        expect(sendMessageMock).toHaveBeenCalledWith({
            QueueUrl: 'APIRequestsQueueURL',
            MessageGroupId: 'api-requests',
            MessageBody: JSON.stringify(TestAPIRequestMessage)
        })
    })
})