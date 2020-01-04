import TypeUtils from "../src/type-utils";

beforeEach((done) => {
    jest.restoreAllMocks()
    done()
})

describe('isNullish', () => {
    it('should return true if null or undefined', () => {
        expect(TypeUtils.isNullish(null)).toBe(true)
        expect(TypeUtils.isNullish(undefined)).toBe(true)
    })

    it('should return false if not null nor undefined', () => {
        expect(TypeUtils.isNullish(0)).toBe(false)
        expect(TypeUtils.isNullish('')).toBe(false)
        expect(TypeUtils.isNullish(false)).toBe(false)
        expect(TypeUtils.isNullish(1)).toBe(false)
        expect(TypeUtils.isNullish('asdf')).toBe(false)
        expect(TypeUtils.isNullish(true)).toBe(false)
    })
})

describe('isNotNullish', () => {
    it('should return false if null or undefined', () => {
        expect(TypeUtils.isNotNullish(null)).toBe(false)
        expect(TypeUtils.isNotNullish(undefined)).toBe(false)
    })

    it('should return true if not null nor undefined', () => {
        expect(TypeUtils.isNotNullish(0)).toBe(true)
        expect(TypeUtils.isNotNullish('')).toBe(true)
        expect(TypeUtils.isNotNullish(false)).toBe(true)
        expect(TypeUtils.isNotNullish(1)).toBe(true)
        expect(TypeUtils.isNotNullish('asdf')).toBe(true)
        expect(TypeUtils.isNotNullish(true)).toBe(true)
    })
})

const TestObject = {
    foo: 'bar',
    asdf: 'qwer',
    baz: null as string
}
describe('hasAllFields', () => {
    it('should return true if all fields are present and values are not nullish', () => {
        expect(TypeUtils.hasAllFields(TestObject)).toBe(true)
        expect(TypeUtils.hasAllFields(TestObject, 'foo')).toBe(true)
        expect(TypeUtils.hasAllFields(TestObject, 'foo', 'asdf')).toBe(true)
    })

    it('should return false if a field is not present or its value is nullish', () => {
        expect(TypeUtils.hasAllFields(TestObject, 'foo', 'asdf', 'bar')).toBe(false)
        expect(TypeUtils.hasAllFields(TestObject, 'foo', 'asdf', 'baz')).toBe(false)
    })
})

describe('isType', () => {
    it('should return true if hasAllFields passes', () => {
        const hasAllFieldsMock = jest.spyOn(TypeUtils, 'hasAllFields')
        hasAllFieldsMock.mockReturnValue(true)
        expect(TypeUtils.isType('SomeType', TestObject, 'someField')).toBe(true)
    })

    it('should fail if hasAllFields fails', () => {
        const hasAllFieldsMock = jest.spyOn(TypeUtils, 'hasAllFields')
        const failedCheckMock = jest.spyOn(TypeUtils, 'failedCheck')
        failedCheckMock.mockImplementation(() => true)
        hasAllFieldsMock.mockReturnValue(false)

        TypeUtils.isType('SomeType', TestObject, 'someField')

        expect(failedCheckMock).toHaveBeenCalledWith('SomeType', TestObject)
    })
})

describe('failedCheck', () => {
    it('should throw an Error', () => {
        expect(() => TypeUtils.failedCheck('SomeType', TestObject))
            .toThrow('Invalid SomeType ' + JSON.stringify(TestObject))
    })
})