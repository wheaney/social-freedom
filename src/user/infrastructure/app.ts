#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import {UserStack} from './stack';

const app = new cdk.App();
new UserStack(app, 'UserStack');
app.run();
