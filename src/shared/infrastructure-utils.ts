import {
    AuthorizationType,
    CfnAuthorizer,
    IResource,
    LambdaIntegration,
    MockIntegration, PassthroughBehavior,
    Resource
} from "@aws-cdk/aws-apigateway";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";
import {Stack} from "@aws-cdk/core";
import {IRole} from "@aws-cdk/aws-iam";

type Method = "GET" | "PUT" | "POST" | "DELETE"

export class LambdaHelper {
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

export class ApiHelper {
    readonly lambdaHelper: LambdaHelper;
    readonly authorizer: CfnAuthorizer;
    readonly allowedOrigin: string;

    constructor(lambdaHelper: LambdaHelper, authorizer: CfnAuthorizer, allowedOrigin: string) {
        this.lambdaHelper = lambdaHelper
        this.authorizer = authorizer
        this.allowedOrigin = allowedOrigin
    }

    constructLambdaApi(parentResource: IResource, path: string, method: Method, handler: string):Resource {
        const resource = parentResource.addResource(path)
        this.addCorsOptions(resource)
        this.constructLambdaApiMethod(resource, method, handler)

        return resource
    }

    constructLambdaApiMethod(resource: IResource, method: Method, handler: string) {
        resource.addMethod(method, new LambdaIntegration(this.lambdaHelper.constructLambda(handler), {
            proxy: true,
            allowTestInvoke: true
        }), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {authorizerId: this.authorizer.ref}
        })
    }

    // https://github.com/aws/aws-cdk/issues/906
    addCorsOptions(apiResource: IResource) {
        apiResource.addMethod('OPTIONS', new MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                    'method.response.header.Access-Control-Allow-Origin': `'${this.allowedOrigin}'`,
                    'method.response.header.Access-Control-Allow-Credentials': "'true'",
                    'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
                }
            }],
            passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
            requestTemplates: {
                "application/json": "{\"statusCode\": 200}"
            }
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Credentials': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                }

            }]
        })
    }
}