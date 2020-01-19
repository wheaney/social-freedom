import {
    isFollowRequest,
    isFollowRequestCreateResponse,
    isFollowRequestResponse,
    isInternalFollowResponse
} from "../../src";
import TypeUtils from "../../src/type-utils";
import {TestAccountDetails} from "./shared";

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})

describe('isFollowRequest', () => {
    it('should pass', () => {
        expect(isFollowRequest(TestAccountDetails)).toBe(true)
    })

    it('should fail on an invalid object', () => {
        expect(() => isFollowRequest({
            ...TestAccountDetails,
            name: undefined
        })).toThrow(new RegExp('Invalid FollowRequest .*'))
    })
})

describe('isFollowRequestResponse', () => {
    it('should fail with no accountDetails when accepted is false', () => {
        expect(() => isFollowRequestResponse({
            accepted: false
        })).toThrow(new RegExp('Invalid FollowRequestResponse .*'))
    })

    it('should fail with no accountDetails when accepted is true', () => {
        expect(() => isFollowRequestResponse({
            accepted: true
        })).toThrow(new RegExp('Invalid FollowRequestResponse .*'))
    })

    it('should fail when accepted is not present', () => {
        expect(() => isFollowRequestResponse({
            accountDetails: TestAccountDetails
        })).toThrow(new RegExp('Invalid FollowRequestResponse .*'))
    })

    it('should pass with accountDetails when accepted is present', () => {
        expect(isFollowRequestResponse({
            accepted: true,
            accountDetails: TestAccountDetails
        })).toBe(true)
    })
})

describe('isFollowRequestCreateResponse', () => {
    it('should pass with no response', () => {
        expect(isFollowRequestCreateResponse({})).toBe(true)
    })

    it('should fail with a response that is not valid', () => {
        expect(() => isFollowRequestCreateResponse({
            response: {}
        })).toThrow(new RegExp('Invalid FollowRequestCreateResponse .*'))
    })

    it('should pass with a response that is valid', () => {
        expect(isFollowRequestCreateResponse({
                response: {
                    accepted: true,
                    accountDetails: TestAccountDetails
                }
            }
        )).toBe(true)
    })
})

describe('isInternalFollowResponse', () => {
    it('should delegate to TypeUtils.isType', () => {
        const isTypeMock = jest.spyOn(TypeUtils, 'isType')
        isTypeMock.mockReturnValue(true)
        expect(isInternalFollowResponse(TestAccountDetails)).toBe(true)

        isTypeMock.mockReturnValue(false)
        expect(isInternalFollowResponse(TestAccountDetails)).toBe(false)
        expect(isTypeMock).toHaveBeenCalledWith('InternalFollowResponse', TestAccountDetails, 'userId', 'accepted')
    })
})