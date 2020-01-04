import TypeUtils from "../../src/type-utils";
import {isReducedAccountDetails} from "../../src";

const isTypeMock = jest.spyOn(TypeUtils, 'isType')

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})

const TestObject = {
    foo: 'bar',
    asdf: 'qwer',
    baz: null as string
}

describe('isReducedAccountDetails', () => {
    it('should delegate to TypeUtils.isType', () => {
        isTypeMock.mockReturnValue(true)
        expect(isReducedAccountDetails(TestObject)).toBe(true)

        isTypeMock.mockReturnValue(false)
        expect(isReducedAccountDetails(TestObject)).toBe(false)
        expect(isTypeMock).toHaveBeenCalledWith('ReducedAccountDetails', TestObject, 'userId', 'name', 'apiOrigin', 'profileTopicArn', 'postsTopicArn')
    })
})