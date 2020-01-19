import APIGateway, {EventFunctions} from "../../src/shared/api-gateway";
import {mockConsole, OtherUserEvent, setupEnvironmentVariables, ThisUserEvent} from "../test-utils";
import {TestObject} from "../../../types/test/types/shared";
import {APIGatewayEvent} from "aws-lambda";
import ThisAccount from "../../src/daos/this-account";


beforeAll(done => {
    setupEnvironmentVariables()
    done()
})

beforeEach(async (done) => {
    jest.restoreAllMocks()
    mockConsole('log')
    done()
})

describe('APIGateway', () => {
    describe('proxyWrapper', () => {
        it('should return 200 if no errors are thrown', async () => {
            const lambdaResponseMock = jest.spyOn(APIGateway, 'lambdaResponse')
            await APIGateway.handleEvent(async () => true)

            expect(lambdaResponseMock).toHaveBeenCalledWith(200, true)
        })

        it('should return 500 if any errors are thrown', async () => {
            const lambdaResponseMock = jest.spyOn(APIGateway, 'lambdaResponse')
            const consoleErrorMock = mockConsole('error')

            const error = new Error('haha')
            await APIGateway.handleEvent(async () => {
                throw error
            })

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
                await APIGateway.internalAPIIdentityCheck(OtherUserEvent, testEventFunctions)
            } catch (err) {
                expect(err.message).toBe('Unauthorized userId: otherUserId')
            }
        })

        it('should return resolved event values if request is from the registered user of this account', async () => {
            const resolveValuesMock = jest.spyOn(APIGateway, 'resolveEventValues')
            resolveValuesMock.mockImplementation(async (event: APIGatewayEvent) => testEventValues)
            expect(await APIGateway.internalAPIIdentityCheck(ThisUserEvent, testEventFunctions))
                .toStrictEqual(testEventValues)

            expect(resolveValuesMock).toHaveBeenCalledWith(ThisUserEvent, testEventFunctions)
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
                await APIGateway.followerAPIIdentityCheck(OtherUserEvent, testEventFunctions)
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
            expect(await APIGateway.followerAPIIdentityCheck(ThisUserEvent, testEventFunctions))
                .toStrictEqual(isFollowingEventValues)

            expect(resolveValuesMock).toHaveBeenCalledWith(ThisUserEvent, {
                ...testEventFunctions,
                isFollowing: EventFunctions.isFollowingRequestingUser
            })
        })
    })

    describe('resolveEventValues', () => {
        it('should resolve just defaults if no functions are provided', async () => {
            expect(await APIGateway.resolveEventValues(ThisUserEvent))
                .toStrictEqual({
                    eventBody: {foo: 'bar'},
                    userId: 'thisUserId',
                    authToken: 'authToken'
                })
        })

        it('should resolve defaults and provided functions', async () => {
            expect(await APIGateway.resolveEventValues(ThisUserEvent, testEventFunctions))
                .toStrictEqual({
                    eventBody: {foo: 'bar'},
                    userId: 'thisUserId',
                    authToken: 'authToken',
                    someEventFunction: 'eventFunctionValue'
                })
        })
    })
})

describe('EventFunctions', () => {
    test('getUserId should pull the userId from the APIGatewayEvent, if present', () => {
        expect(EventFunctions.getUserId(ThisUserEvent)).toBe('thisUserId')
        expect(EventFunctions.getUserId({} as unknown as APIGatewayEvent)).toBeUndefined()
    });

    test('getAuthToken should pull the authToken from the APIGatewayEvent, if present', () => {
        expect(EventFunctions.getAuthToken(ThisUserEvent)).toBe('authToken')
        expect(EventFunctions.getAuthToken({} as unknown as APIGatewayEvent)).toBeUndefined()
    });

    test('isFollowingRequestingUser should call to isFollowing', async () => {
        const isFollowingMock = jest.spyOn(ThisAccount, 'isFollowing')
        isFollowingMock.mockResolvedValue(true)

        expect(await EventFunctions.isFollowingRequestingUser(ThisUserEvent)).toBe(true)
        expect(isFollowingMock).toHaveBeenCalledWith('thisUserId')
    });

    test('cachedUsers should pull and split usersId from the query string params, if present', async () => {
        expect(EventFunctions.cachedUsers(ThisUserEvent)).toStrictEqual(['userId', 'otherUserId'])
        expect(EventFunctions.cachedUsers({} as unknown as APIGatewayEvent)).toStrictEqual([])
    })
})