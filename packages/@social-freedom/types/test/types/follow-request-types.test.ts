import {
    isFollowRequest,
    isFollowRequestCreateResponse,
    isFollowRequestResponse,
    ReducedAccountDetails
} from "../../src";

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