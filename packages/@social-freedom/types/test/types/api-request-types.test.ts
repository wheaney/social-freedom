import TypeUtils from "../../src/type-utils";
import {TestObject} from "./shared";
import {isAsyncAPIRequest} from "../../src/types/api-request-types";

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})


describe('isAsyncAPIRequest', () => {
    it('should delegate to TypeUtils.isType', () => {
        const isTypeMock = jest.spyOn(TypeUtils, 'isType')
        isTypeMock.mockReturnValue(true)
        expect(isAsyncAPIRequest(TestObject)).toBe(true)
        expect(isTypeMock).toHaveBeenCalledWith('AsyncAPIRequest', TestObject, 'origin', 'path', 'authToken', 'requestMethod')

        isTypeMock.mockReturnValue(false)
        expect(isAsyncAPIRequest(TestObject)).toBe(false)
    })
})