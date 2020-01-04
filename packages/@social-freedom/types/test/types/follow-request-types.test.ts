import {
    isFollowRequest,
    isFollowRequestCreateResponse,
    isFollowRequestResponse,
    isInternalFollowResponse,
    ReducedAccountDetails
} from "../../src";
import TypeUtils from "../../src/type-utils";

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})

const CompleteAccountDetails: ReducedAccountDetails = {
    userId: 'userId',
    apiOrigin: 'apiOrigin',
    name: 'name',
    postsTopicArn: 'postsTopicArn',
    profileTopicArn: 'profileTopicArn'
}

describe('isFollowRequest', () => {
    it('should pass', () => {
        expect(isFollowRequest(CompleteAccountDetails)).toBe(true)
    })

    it('should fail on an invalid object', () => {
        expect(() => isFollowRequest({
            ...CompleteAccountDetails,
            name: undefined
        })).toThrow(new RegExp('Invalid FollowRequest .*'))
    })
})

describe('isFollowRequestResponse', () => {
    it('should pass with no accountDetails when accepted is false', () => {
        expect(isFollowRequestResponse({
            accepted: false
        })).toBe(true)
    })

    it('should fail with no accountDetails when accepted is true', () => {
        expect(() => isFollowRequestResponse({
            accepted: true
        })).toThrow(new RegExp('Invalid FollowRequestResponse .*'))
    })

    it('should pass with accountDetails when accepted is true', () => {
        expect(isFollowRequestResponse({
            accepted: true,
            accountDetails: CompleteAccountDetails
        })).toBe(true)
    })

    it('should fail when accepted is not present', () => {
        expect(() => isFollowRequestResponse({
            accountDetails: CompleteAccountDetails
        })).toThrow(new RegExp('Invalid FollowRequestResponse .*'))
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
                    accepted: false
                }
            }
        )).toBe(true)
    })
})

describe('isInternalFollowResponse', () => {
    it('should delegate to TypeUtils.isType', () => {
        const isTypeMock = jest.spyOn(TypeUtils, 'isType')
        isTypeMock.mockReturnValue(true)
        expect(isInternalFollowResponse(CompleteAccountDetails)).toBe(true)

        isTypeMock.mockReturnValue(false)
        expect(isInternalFollowResponse(CompleteAccountDetails)).toBe(false)
        expect(isTypeMock).toHaveBeenCalledWith('InternalFollowResponse', CompleteAccountDetails, 'userId', 'accepted')
    })
})