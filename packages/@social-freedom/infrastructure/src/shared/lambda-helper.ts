import {Stack} from "@aws-cdk/core";
import {IRole} from "@aws-cdk/aws-iam";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";

export default class LambdaHelper {
    readonly stack: Stack;
    readonly role: IRole;
    readonly envVars:{[key:string]: any};
    readonly code: Code;

    constructor(stack: Stack, role: IRole, envVars: {[key:string]: any}, code: Code) {
        this.stack = stack
        this.role = role
        this.envVars = envVars
        this.code = code
    }

    constructLambda(handler: string):LambdaFunction {
        // TODO - DLQ setup for lambda failures

        // Lambda references assume that tsc has compiled all *.ts files to the dist directory
        return new LambdaFunction(this.stack, handler, {
            runtime: Runtime.NODEJS_10_X,
            code: this.code,
            handler: `${handler}.handler`,
            role: this.role,
            environment: this.envVars
        });
    }
}