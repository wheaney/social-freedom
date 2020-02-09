import {Optional} from "../../src";

describe('map', () => {
    it('should not call the provided function is value is nullish', () => {
        const mockFn = jest.fn()
        expect(Optional.of(undefined).map(mockFn).get()).toBeUndefined()
        Optional.of(null).map(mockFn)

        expect(mockFn).not.toHaveBeenCalled()
    })

    it('should call the provided function is value is not nullish', () => {
        const mockFn = jest.fn()
        Optional.of(0).map(mockFn)
        Optional.of('').map(mockFn)
        Optional.of(false).map(mockFn)

        expect(mockFn).toHaveBeenCalledTimes(3)
        expect(mockFn).toHaveBeenNthCalledWith(1, 0)
        expect(mockFn).toHaveBeenNthCalledWith(2, '')
        expect(mockFn).toHaveBeenNthCalledWith(3, false)
    })
});

test('get should return the value', () => {
    expect(Optional.of(null).get()).toBe(null)
    expect(Optional.of(undefined).get()).toBe(undefined)
    expect(Optional.of(0).get()).toBe(0)
    expect(Optional.of(true).get()).toBe(true)
    expect(Optional.of('someString').get()).toBe('someString')
})