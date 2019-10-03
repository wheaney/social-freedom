import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {UserStack} from "./stack";

const app = new cdk.App();
new UserStack(app, false, 'https://social-freedom-test.auth.us-east-1.amazoncognito.com', 'dev', 'arn:aws:cognito-idp:us-east-1:026810594887:userpool/us-east-1_NNDzc6RVP');

app.synth();
