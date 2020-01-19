const TypeUtils = {
    isNullish: (object: any) => {
        return object === null || object === undefined
    },

    isNotNullish: (object: any) => {
        return object !== null && object !== undefined
    },

    hasAllFields: (object: any, ...fields: string[]): boolean => {
        return !fields.find(field => TypeUtils.isNullish(object?.[field]))
    },

    isType: (type: string, object: any, ...fields: string[]) =>  {
        if (TypeUtils.hasAllFields(object, ...fields)) {
            return true
        }

        return TypeUtils.failedCheck(type, object)
    },

    failedCheck: (type: string, object: any): boolean => {
        throw new Error(`Invalid ${type} ${JSON.stringify(object)}`)
    }
}

export default TypeUtils