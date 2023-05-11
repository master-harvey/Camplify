import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, aws_s3 as s3, aws_iam as iam, aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthVals } from './Auth';

// Construct Inputs
export interface PubSubProps extends NestedStackProps {
  appName: string
}

// Construct Outputs (for the UI)
export interface PubSubVals {  }

export class PubSub extends NestedStack {
  constructor(scope: Construct, id: string, props: PubSubProps) {
    super(scope, id);
    // NOT IMPLEMENTED
    const vals: PubSubVals = {  }
  }
}
