import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {UserStack} from "./stack";

const app = new cdk.App();
new UserStack(app, false, 'https://d325d3uej8gzt4.cloudfront.net', 'dev', 'arn:aws:cognito-idp:us-east-1:026810594887:userpool/us-east-1_NNDzc6RVP');

app.synth();
