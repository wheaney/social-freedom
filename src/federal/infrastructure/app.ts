import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Code, Runtime, Function as LambdaFunction} from "@aws-cdk/aws-lambda";
import {Table, AttributeType} from "@aws-cdk/aws-dynamodb"
import {PolicyStatement, ServicePrincipal, Role} from "@aws-cdk/aws-iam"
import * as fs from "fs";

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

// Lambda references assume that tsc has compiled all *.ts files to the dist directory
new LambdaFunction(stack, 'AccountRegistrationHandler', {
    runtime: Runtime.NODEJS_8_10,
    code: Code.fromInline(fs.readFileSync('./dist/src/federal/infrastructure/lambdas/account-registration/index.js').toString()),
    handler: 'index.handler',
    role: ExecutionerRole
});

const IdentityToAccountTable = new Table(stack, "IdentityToAccount", {
    partitionKey: {
        name: "identity",
        type: AttributeType.STRING
    },
    tableName: "IdentityToAccount"
});

ExecutionerRole.addToPolicy(new PolicyStatement({
    resources: [IdentityToAccountTable.tableArn],
    actions: ['dynamodb:putItem']
}));

app.synth()