import {Duration, Stack} from "@aws-cdk/core";
import {IRole} from "@aws-cdk/aws-iam";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";

const SyncTimeoutSeconds = 3
const AsyncTimeoutSeconds = 15

export default class LambdaHelper {
    readonly stack: Stack;
    readonly role: IRole;
    readonly envVars:{[key:string]: any};
    readonly code: Code;
    readonly lambdas: LambdaFunction[];

    constructor(stack: Stack, role: IRole, envVars: {[key:string]: any}, code: Code) {
        this.stack = stack
        this.role = role
        this.envVars = envVars
        this.code = code
        this.lambdas = []
    }

    constructLambda(handler: string, async: boolean = false):LambdaFunction {
        // TODO - DLQ setup for lambda failures

        // Lambda references assume that tsc has compiled all *.ts files to the dist directory
        const lambda = new LambdaFunction(this.stack, handler, {
            runtime: Runtime.NODEJS_12_X,
            code: this.code,
            handler: `${handler}.handler`,
            role: this.role,
            environment: this.envVars,
            timeout: Duration.seconds(async ? AsyncTimeoutSeconds : SyncTimeoutSeconds)
        });

        this.lambdas.push(lambda)

        return lambda
    }
}