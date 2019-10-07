import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Code} from "@aws-cdk/aws-lambda";
import {AttributeType, Table} from "@aws-cdk/aws-dynamodb"
import {CanonicalUserPrincipal, PolicyStatement, Role, ServicePrincipal} from "@aws-cdk/aws-iam"
import {AuthorizationType, CfnAuthorizer, EndpointType, RestApi} from "@aws-cdk/aws-apigateway";
import {CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";
import {Bucket} from "@aws-cdk/aws-s3";
import {ApiHelper, LambdaHelper} from "../../shared/infrastructure-utils";
import {BucketDeployment, Source} from "@aws-cdk/aws-s3-deployment";

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
const Lambdas = Code.fromAsset('./dist/src/federal/infrastructure/lambdas')
const Helper = new LambdaHelper(stack, ExecutionerRole, EnvironmentVariables, Lambdas)
const ApiUtil = new ApiHelper(Helper, CognitoAuthorizer, isDevelopment ? '*' : process.env.FEDERAL_STACK_WEBSITE_ORIGIN)

ApiUtil.constructLambdaApi(Api.root, 'register', 'POST', 'account-registration')
ApiUtil.constructLambdaApi(Api.root, 'identity', 'GET', 'identity-get')

const WebBucket = new Bucket(stack, 'WebsiteDistributionBucket');

const OriginAccessIdentity = new CfnCloudFrontOriginAccessIdentity(stack, "CloudFrontOriginAccessIdentity", {
    cloudFrontOriginAccessIdentityConfig: {
        comment: "CloudFront access for user media files"
    }
})

const WebDistribution = new CloudFrontWebDistribution(stack, 'CloudFrontWebDistribution', {
    originConfigs: [
        {
            s3OriginSource: {
                s3BucketSource: WebBucket,
                originAccessIdentityId: OriginAccessIdentity.ref
            },
            behaviors : [ {isDefaultBehavior: true}]
        }
    ]
});
WebBucket.addToResourcePolicy(new PolicyStatement({
    principals: [new CanonicalUserPrincipal(OriginAccessIdentity.attrS3CanonicalUserId)],
    resources: [WebBucket.bucketArn, WebBucket.arnForObjects('*')],
    actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"]
}))

new BucketDeployment(stack, 'DeployWithInvalidation', {
    sources: [Source.asset('./src/federal/website/build')],
    destinationBucket: WebBucket,
    distribution: WebDistribution,
    distributionPaths: ['/index.html']
});

app.synth()