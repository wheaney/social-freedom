#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {UserStack} from './stack';

const app = new cdk.App();
new UserStack(app, 'UserStack');
app.synth();
