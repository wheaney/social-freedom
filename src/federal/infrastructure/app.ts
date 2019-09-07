import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import {Code, Runtime, Function as LambdaFunction} from "@aws-cdk/aws-lambda";
import * as fs from "fs";

const app = new cdk.App();
const stack = new cdk.Stack(app, 'FederalStack');

new cdk.Include(stack, "OtherInfrastructure", {
    template: JSON.parse(fs.readFileSync("./src/federal/infrastructure/app-cfn.json").toString())
});

// Lambda references assume that tsc has compiled all *.ts files to the dist directory
new LambdaFunction(stack, 'HelloHandler', {
    runtime: Runtime.NodeJS810,
    code: Code.inline(fs.readFileSync('./dist/federal/infrastructure/lambdas/test.js').toString()),
    handler: 'index.handler'
});

app.run()