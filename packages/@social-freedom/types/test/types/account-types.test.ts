import TypeUtils from "../../src/type-utils";
import {isReducedAccountDetails} from "../../src";
import {TestObject} from "./shared";

const isTypeMock = jest.spyOn(TypeUtils, 'isType')

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})

describe('isReducedAccountDetails', () => {
    it('should delegate to TypeUtils.isType', () => {
        isTypeMock.mockReturnValue(true)
        expect(isReducedAccountDetails(TestObject)).toBe(true)

        isTypeMock.mockReturnValue(false)
        expect(isReducedAccountDetails(TestObject)).toBe(false)
        expect(isTypeMock).toHaveBeenCalledWith('ReducedAccountDetails', TestObject, 'userId', 'name', 'apiOrigin', 'profileTopicArn', 'postsTopicArn')
    })
})