import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {CfnParameter} from "@aws-cdk/core";
import {Code} from "@aws-cdk/aws-lambda";
import {AttributeType, Table} from "@aws-cdk/aws-dynamodb"
import {PolicyStatement, Role, ServicePrincipal} from "@aws-cdk/aws-iam"
import {AuthorizationType, CfnAuthorizer, EndpointType, RestApi} from "@aws-cdk/aws-apigateway";
import {ApiHelper, LambdaHelper} from "../../shared/infrastructure-utils";

const app = new cdk.App();
const stack = new cdk.Stack(app, 'FederalStack');

// Parameters
const environmentParam = new CfnParameter(stack, 'Environment', {
    default: 'development'
})
const isDevelopment:boolean = environmentParam.valueAsString !== 'production';

// one Role for all Lambdas to assume
const ExecutionerRole = new Role(stack, "Executioner", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com")
});

// TODO - ElasticSearch is supported by the CDK now
const OtherInfrastructure = ():any => {
    const ElasticSearchInstanceType:string = isDevelopment ? "t2.micro.elasticsearch" : "m3.medium.elasticsearch"
    const ElasticSearchDevProperties:any = isDevelopment && {
        "EBSOptions": {
            "EBSEnabled" : true,
            "VolumeSize" : 10,
            "VolumeType" : "standard"
        }
    }
    const ElasticSearchVersion:string = isDevelopment ? "2.3" : "6.5"

    return {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Infrastructure that can't be defined in the Typescript CDK",
        "Resources": {
            "ElasticSearch": {
                "Type": "AWS::Elasticsearch::Domain",
                "Properties": {
                    "ElasticsearchVersion": ElasticSearchVersion,
                    "ElasticsearchClusterConfig": {
                        "InstanceCount" : 1,
                        "InstanceType" : ElasticSearchInstanceType
                    },
                    ...ElasticSearchDevProperties
                }
            }
        }
    }
}

new cdk.CfnInclude(stack, "OtherInfrastructure", {
    template: OtherInfrastructure()
});

const Api = new RestApi(stack, "API", {
    endpointTypes: [EndpointType.EDGE]
})

const CognitoAuthorizer = new CfnAuthorizer(stack, "CognitoAuthorizer", {
    name: "CognitoAuthorizer",
    type: AuthorizationType.COGNITO,
    identitySource: "method.request.header.Authorization",
    restApiId: Api.restApiId,
    providerArns: ['placeholder'] // TODO - construct user pool
})
const Lambdas = Code.fromAsset('./dist/src/federal/infrastructure/lambdas')
const Helper = new LambdaHelper(stack, ExecutionerRole, {}, Lambdas)
const ApiUtil = new ApiHelper(Helper, CognitoAuthorizer, "social-freedom.com")

ApiUtil.constructLambdaApi(Api.root, 'register', 'POST', 'account-registration')

const IdentityToAccountTable = new Table(stack, "IdentityToAccount", {
    partitionKey: {
        name: "cognitoIdentityId",
        type: AttributeType.STRING
    },
    tableName: "IdentityToAccount"
});

ExecutionerRole.addToPolicy(new PolicyStatement({
    resources: [IdentityToAccountTable.tableArn],
    actions: ['dynamodb:putItem']
}));

app.synth()