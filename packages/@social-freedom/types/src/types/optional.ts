import TypeUtils from "../type-utils";

type OptionalFunction<T, U> = (value: T) => U

export class Optional<T> {
    private readonly value: T;

    constructor(value:T) {
        this.value = value;
    }

    static of<T>(value: T): Optional<T> {
        return new Optional(value)
    }

    map<U>(fn: OptionalFunction<T, U>): Optional<U> {
        if (TypeUtils.isNotNullish(this.value)) {
            return new Optional(fn(this.value))
        }

        return Optional.of(undefined as U)
    }

    get(): T {
        return this.value
    }
}