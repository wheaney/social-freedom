import TypeUtils from "../../src/type-utils";
import {TestObject} from "./shared";
import {isAPIRequestMessage} from "../../src/types/api-request-types";

afterAll((done) => {
    jest.restoreAllMocks()
    done()
})


describe('isAPIRequestMessage', () => {
    it('should delegate to TypeUtils.isType', () => {
        const isTypeMock = jest.spyOn(TypeUtils, 'isType')
        isTypeMock.mockReturnValue(true)
        expect(isAPIRequestMessage(TestObject)).toBe(true)

        isTypeMock.mockReturnValue(false)
        expect(isAPIRequestMessage(TestObject)).toBe(false)
        expect(isTypeMock).toHaveBeenCalledWith('APIRequestMessage', TestObject, 'origin', 'path', 'authToken', 'requestMethod')
    })
})