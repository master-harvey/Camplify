#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CamplifyCiStack } from '../lib/ci-stack';

const app = new cdk.App();
new CamplifyCiStack(app, 'CiStack', {
  env: { account: '526411345739', region: 'us-east-2' }
});