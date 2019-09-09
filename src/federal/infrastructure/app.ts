import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Code, Runtime, Function as LambdaFunction} from "@aws-cdk/aws-lambda";
import {Table, AttributeType} from "@aws-cdk/aws-dynamodb"
import {PolicyStatement} from "@aws-cdk/aws-iam"
import * as fs from "fs";

const app = new cdk.App();
const stack = new cdk.Stack(app, 'FederalStack');

const OtherInfrastructure = (stage:string):any => {
    const isDevelopment:boolean = stage === "dev"
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
    template: OtherInfrastructure("dev")
});

// Lambda references assume that tsc has compiled all *.ts files to the dist directory
const AccountRegistrationLambda = new LambdaFunction(stack, 'AccountRegistrationHandler', {
    runtime: Runtime.NODEJS_8_10,
    code: Code.fromInline(fs.readFileSync('./dist/src/federal/infrastructure/lambdas/account-registration/index.js').toString()),
    handler: 'index.handler'
});

const IdentityToAccountTable = new Table(stack, "IdentityToAccount", {
    partitionKey: {
        name: "identity",
        type: AttributeType.STRING
    },
    tableName: "IdentityToAccount"
})

if (AccountRegistrationLambda.role) {
    AccountRegistrationLambda.role.addToPolicy(new PolicyStatement({
        resources: [IdentityToAccountTable.tableArn],
        actions: ['dynamodb:putItem']
    }));
} else {
    throw new Error("AccountRegistrationLambda role is undefined")
}

app.synth()