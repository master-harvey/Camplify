import { Construct } from 'constructs';
import { aws_s3 as s3, aws_iam as iam, aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthVals } from './Auth';

// Construct Inputs
export interface PubSubProps {
  appName: string
}

// Construct Outputs (for the UI)
export interface PubSubVals {  }

export class PubSub extends Construct {
  constructor(scope: Construct, id: string, props: PubSubProps) {
    super(scope, id);
    // NOT IMPLEMENTED
    const vals: PubSubVals = {  }
  }
}
