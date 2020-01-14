import {mockConsole, setupEnvironmentVariables, TestAPIRequestMessage} from "../test-utils";
import SQS from "../../src/services/sqs";
import UserAPI from "../../src/services/user-api";
import {TestObject} from "../../../types/test/types/shared";
import fetch, {Response} from "node-fetch";

jest.mock('node-fetch')
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

beforeAll(async (done) => {
    setupEnvironmentVariables()
    done()
})

let consoleErrorMock: jest.SpyInstance<void, any>;
beforeEach(async (done) => {
    jest.clearAllMocks()
    mockConsole('log')
    consoleErrorMock = mockConsole('error')
    done()
});

describe('queueRequest', () => {
    it('should call sendAPIRequestMessage', async () => {
        const sendMessageMock = jest.spyOn(SQS, 'sendAPIRequestMessage')
        sendMessageMock.mockResolvedValue()

        await UserAPI.queueRequest('origin', 'path', 'authToken', 'POST', TestObject)

        expect(sendMessageMock).toHaveBeenCalledWith(TestAPIRequestMessage)
    })
})

describe('reequest', () => {
    it('should fail if synchronous requests are not allowed', async () => {
        try {
            await UserAPI.request('origin', 'path', 'authToken', 'POST')
            fail('should have thrown an error')
        } catch (err) {
            expect(err.message).toBe('Synchronous API requests not allowed within this function')
        }
    })

    it('should blow up on non-200 response', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({ ok: false, status: 500 } as unknown as Response)

        try {
            await UserAPI.request('origin', 'path', 'authToken', 'POST')
            fail('should have thrown an error')
        } catch (err) {
            expect(err.message).toBe('API request to URL originpath returned with status 500')
        }
    })

    it('should call fetch with no body or content headers for a GET request', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => ''
        } as unknown as Response)

        await UserAPI.request('origin', 'path', 'authToken', 'GET')

        expect(mockFetch).toHaveBeenCalledWith("originpath", {
            method: 'GET',
            headers: {
                'Authorization': 'authToken'
            }
        })
    })

    it('should call fetch with no body or content headers for a POST with no body', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => ''
        } as unknown as Response)

        await UserAPI.request('origin', 'path', 'authToken', 'POST')

        expect(mockFetch).toHaveBeenCalledWith("originpath", {
            method: 'POST',
            headers: {
                'Authorization': 'authToken'
            }
        })
    })

    it('should call fetch with a body and content headers for a POST with body content', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => ''
        } as unknown as Response)

        await UserAPI.request('origin', 'path', 'authToken', 'POST', TestObject)

        const bodyString = JSON.stringify(TestObject)
        expect(mockFetch).toHaveBeenCalledWith("originpath", {
            method: 'POST',
            body: bodyString,
            headers: {
                'Authorization': 'authToken',
                'Content-Type': 'application/json',
                'Content-Length': bodyString.length.toString()
            }
        })
    })

    it('should return nothing if response body is empty', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => ''
        } as unknown as Response)

        expect(await UserAPI.request('origin', 'path', 'authToken', 'POST', TestObject))
            .toBeUndefined()
        expect(consoleErrorMock).not.toHaveBeenCalled()
    })

    it('should log an error if response body is not JSON', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => 'not json'
        } as unknown as Response)

        await UserAPI.request('origin', 'path', 'authToken', 'POST')

        expect(consoleErrorMock).toHaveBeenCalledWith('Unexpected response body: not json')
    })

    it('should return an object if response body is JSON', async () => {
        process.env.ALLOW_SYNCHRONOUS_API_REQUESTS = 'true'
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(TestObject)
        } as unknown as Response)

        expect(await UserAPI.request('origin', 'path', 'authToken', 'POST'))
            .toStrictEqual(TestObject)

        expect(consoleErrorMock).not.toHaveBeenCalled()
    })
})