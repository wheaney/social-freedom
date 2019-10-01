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

const AccountsTable = new Table(stack, "Accounts", {
    partitionKey: {
        name: "userId",
        type: AttributeType.STRING
    }
});

ExecutionerRole.addToPolicy(new PolicyStatement({
    resources: [AccountsTable.tableArn],
    actions: ['dynamodb:putItem']
}));

const Api = new RestApi(stack, "API", {
    endpointTypes: [EndpointType.EDGE]
})
const EnvironmentVariables = {
    ACCOUNTS_TABLE: AccountsTable.tableName
}

const CognitoAuthorizer = new CfnAuthorizer(stack, "CognitoAuthorizer", {
    name: "CognitoAuthorizer",
    type: AuthorizationType.COGNITO,
    identitySource: "method.request.header.Authorization",
    restApiId: Api.restApiId,
    providerArns: ['arn:aws:cognito-idp:us-east-1:026810594887:userpool/us-east-1_NNDzc6RVP'] // TODO - remove hardcoded value
})
const Lambdas = Code.fromAsset('./dist/src/federal/infrastructure/lambdas')
const Helper = new LambdaHelper(stack, ExecutionerRole, EnvironmentVariables, Lambdas)
const ApiUtil = new ApiHelper(Helper, CognitoAuthorizer, "social-freedom.com")

ApiUtil.constructLambdaApi(Api.root, 'register', 'POST', 'account-registration')

app.synth()