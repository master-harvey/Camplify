import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, aws_s3 as s3, aws_iam as iam, aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthVals } from './Auth';

// Construct Inputs
export interface RestProps extends NestedStackProps {
  appName: string
}

// Construct Outputs (for the UI)
export interface RestVals {  }

export class Rest extends NestedStack {
  constructor(scope: Construct, id: string, props: RestProps) {
    super(scope, id);
    // NOT IMPLEMENTED
    const vals: RestVals = {  }
  }
}
