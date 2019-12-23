import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {UserStack} from "./stack";

const app = new cdk.App();

// we'll be able to set these environment variables in our pipeline's CodeBuild step
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codebuild-project-environmentvariable.html
// f6655ca8-d8b0-44ba-99dc-ea3fa6061881
// f3a8e1c0-d782-4438-b512-208959dfedcd
// 460ac10f-159f-4fd1-9f9b-9387d2649994
new UserStack(app, process.env.NODE_ENV !== 'production',
    process.env.FEDERAL_STACK_WEBSITE_ORIGIN, process.env.USER_STACK_USER_ID,
    process.env.FEDERAL_STACK_USER_POOL_ARN);

app.synth();
