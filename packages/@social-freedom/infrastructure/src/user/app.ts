import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {UserStack} from "./stack";

const app = new cdk.App();

// we'll be able to set these environment variables in our pipeline's CodeBuild step
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codebuild-project-environmentvariable.html

new UserStack(app, process.env.NODE_ENV !== 'production',
    process.env.FEDERAL_STACK_WEBSITE_ORIGIN, process.env.USER_STACK_USER_ID,
    process.env.FEDERAL_STACK_USER_POOL_ARN);

app.synth();
