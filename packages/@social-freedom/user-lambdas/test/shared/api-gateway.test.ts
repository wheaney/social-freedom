import APIGateway from "../../src/shared/api-gateway";
import {mockConsole, setupEnvironmentVariables} from "../test-utils";
import {TestObject} from "../../../types/test/types/shared";
import {APIGatewayEvent} from "aws-lambda";
import {AuthTokenHeaderName} from "../../src/shared/constants";

const thisUserEvent = {
    requestContext: {
        authorizer: {
            claims: {
                sub: "thisUserId"
            }
        }
    },
    headers: {
        [AuthTokenHeaderName]: "authToken"
    },
    body: JSON.stringify({ foo: 'bar' })
} as unknown as APIGatewayEvent

const otherUserEvent = {
    requestContext: {
        authorizer: {
            claims: {
                sub: "otherUserId"
            }
        }
    }
} as unknown as APIGatewayEvent

beforeAll(done => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.restoreAllMocks()
    mockConsole('log')
    done()
})

describe('proxyWrapper', () => {
    it('should return 200 if no errors are thrown', async () => {
        const lambdaResponseMock = jest.spyOn(APIGateway, 'lambdaResponse')
        await APIGateway.proxyWrapper(async () => true)

        expect(lambdaResponseMock).toHaveBeenCalledWith(200, true)
    })

    it('should return 500 if any errors are thrown', async () => {
        const lambdaResponseMock = jest.spyOn(APIGateway, 'lambdaResponse')
        const consoleErrorMock = mockConsole('error')

        const error = new Error('haha')
        await APIGateway.proxyWrapper(async () => { throw error })

        expect(consoleErrorMock).toHaveBeenCalledWith(error)
        expect(lambdaResponseMock).toHaveBeenCalledWith(500)
    })
})

describe('lambdaResponse', () => {
    it('should handle no responseBody', () => {
        expect(APIGateway.lambdaResponse(500)).toStrictEqual({
            statusCode: '500',
            body: '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': 'allowedOrigin'
            }
        })
    })

    it('should handle a responseBody', () => {
        expect(APIGateway.lambdaResponse(200, TestObject)).toStrictEqual({
            statusCode: '200',
            body: JSON.stringify(TestObject),
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': 'allowedOrigin'
            }
        })
    })
})

const testEventFunctions = {
    someEventFunction: () => 'eventFunctionValue'
}
const testEventValues = {
    userId: "thisUserId",
    authToken: "authToken",
    eventBody: {}
}
describe('internalAPIIdentityCheck', () => {
    it('should throw an error if the request is not from the registered user of this account', async () => {
        try {
            await APIGateway.internalAPIIdentityCheck(otherUserEvent, testEventFunctions)
        } catch (err) {
            expect(err.message).toBe('Unauthorized userId: otherUserId')
        }
    })

    it('should return resolved event values if request is from the registered user of this account', async () => {
        const resolveValuesMock = jest.spyOn(APIGateway, 'resolveEventValues')
        resolveValuesMock.mockImplementation(async (event: APIGatewayEvent) => testEventValues)
        expect(await APIGateway.internalAPIIdentityCheck(thisUserEvent, testEventFunctions))
            .toStrictEqual(testEventValues)

        expect(resolveValuesMock).toHaveBeenCalledWith(thisUserEvent, testEventFunctions)
    })
})

describe('followerAPIIdentityCheck', () => {
    it('should throw an error if the request is not from a following user', async () => {
        const resolveValuesMock = jest.spyOn(APIGateway, 'resolveEventValues')
        resolveValuesMock.mockImplementation(async (event: APIGatewayEvent) => ({
            ...testEventValues,
            userId: "otherUserId",
            isFollowing: false
        }))

        try {
            await APIGateway.followerAPIIdentityCheck(otherUserEvent, testEventFunctions)
        } catch (err) {
            expect(err.message).toBe('Unauthorized userId: otherUserId')
        }
    })

    it('should return resolved event values if request is from the registered user of this account', async () => {
        const resolveValuesMock = jest.spyOn(APIGateway, 'resolveEventValues')
        const isFollowingEventValues = {
            ...testEventValues,
            isFollowing: true
        }
        resolveValuesMock.mockImplementation(async (event: APIGatewayEvent) => isFollowingEventValues)
        expect(await APIGateway.internalAPIIdentityCheck(thisUserEvent, testEventFunctions))
            .toStrictEqual(isFollowingEventValues)

        expect(resolveValuesMock).toHaveBeenCalledWith(thisUserEvent, testEventFunctions)
    })
})

describe('resolveEventValues', () => {
    it('should resolve just defaults if no functions are provided', async () => {
        expect(await APIGateway.resolveEventValues(thisUserEvent))
            .toStrictEqual({
                eventBody: { foo: 'bar' },
                userId: 'thisUserId',
                authToken: 'authToken'
            })
    })

    it('should resolve defaults and provided functions', async () => {
        expect(await APIGateway.resolveEventValues(thisUserEvent, testEventFunctions))
            .toStrictEqual({
                eventBody: { foo: 'bar' },
                userId: 'thisUserId',
                authToken: 'authToken',
                someEventFunction: 'eventFunctionValue'
            })
    })
})