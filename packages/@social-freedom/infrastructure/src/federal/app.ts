import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Code} from "@aws-cdk/aws-lambda";
import {AttributeType, Table} from "@aws-cdk/aws-dynamodb"
import {CanonicalUserPrincipal, ManagedPolicy, PolicyStatement, Role, ServicePrincipal} from "@aws-cdk/aws-iam"
import {AuthorizationType, CfnAuthorizer, EndpointType, RestApi} from "@aws-cdk/aws-apigateway";
import {
    CloudFrontWebDistribution,
    OriginAccessIdentity
} from "@aws-cdk/aws-cloudfront";
import {Bucket} from "@aws-cdk/aws-s3";
import {BucketDeployment, Source} from "@aws-cdk/aws-s3-deployment";
import LambdaHelper from "../shared/lambda-helper";
import {ApiHelper} from "../shared/api-helper";

const app = new cdk.App();
const stack = new cdk.Stack(app, 'FederalStack');

const isDevelopment:boolean = process.env.NODE_ENV !== 'production';

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
    actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:PutItem']
}));
ExecutionerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))

const Api = new RestApi(stack, "API", {
    endpointTypes: [EndpointType.EDGE]
})
const EnvironmentVariables = {
    ACCOUNTS_TABLE: AccountsTable.tableName,
    CORS_ORIGIN: isDevelopment ? '*' : process.env.FEDERAL_STACK_WEBSITE_ORIGIN
}

const CognitoAuthorizer = new CfnAuthorizer(stack, "CognitoAuthorizer", {
    name: "CognitoAuthorizer",
    type: AuthorizationType.COGNITO,
    identitySource: "method.request.header.Authorization",
    restApiId: Api.restApiId,
    providerArns: [process.env.FEDERAL_STACK_USER_POOL_ARN] // TODO - build user pool in CDK
})
const Lambdas = Code.fromAsset('./node_modules/@social-freedom/federal-lambdas')
const Helper = new LambdaHelper(stack, ExecutionerRole, EnvironmentVariables, Lambdas)
const ApiUtil = new ApiHelper(Helper, CognitoAuthorizer, isDevelopment ? '*' : process.env.FEDERAL_STACK_WEBSITE_ORIGIN)

ApiUtil.constructLambdaApi(Api.root, 'register', 'POST', 'account-registration')
ApiUtil.constructLambdaApi(Api.root, 'identity', 'GET', 'identity-get')

const WebBucket = new Bucket(stack, 'WebsiteDistributionBucket');

const S3OriginAccessIdentity = new OriginAccessIdentity(stack, "CloudFrontOriginAccessIdentity", {
    comment: "CloudFront access for user media files"
})

const WebDistribution = new CloudFrontWebDistribution(stack, 'CloudFrontWebDistribution', {
    originConfigs: [
        {
            s3OriginSource: {
                s3BucketSource: WebBucket,
                originAccessIdentity: S3OriginAccessIdentity
            },
            behaviors : [ {isDefaultBehavior: true}]
        }
    ]
});
WebBucket.addToResourcePolicy(new PolicyStatement({
    principals: [new CanonicalUserPrincipal(S3OriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    resources: [WebBucket.bucketArn, WebBucket.arnForObjects('*')],
    actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"]
}))

new BucketDeployment(stack, 'DeployWithInvalidation', {
    sources: [Source.asset('./node_modules/@social-freedom/website/build')],
    destinationBucket: WebBucket,
    distribution: WebDistribution,
    distributionPaths: ['/index.html']
});

app.synth()