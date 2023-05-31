import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, aws_s3 as s3, aws_iam as iam, aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthVals } from './Auth';

// Construct Inputs
export interface StorageProps extends NestedStackProps {
  appName: string,
  auth: AuthVals,
  cors?: [s3.CorsRule],
  allowedOrigins?: [string]
}

// Construct Outputs (for the UI)
export interface StorageVals { bucket: s3.Bucket }

export class Storage extends NestedStack {
  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "StorageBucket", {
      bucketName: `${props.appName.toLowerCase()}-camplify-storage`,
      cors: props.cors ?? [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE
          ],
          allowedOrigins: props.allowedOrigins ?? ["*"],
          exposedHeaders: ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"],
          maxAge: 3000
        }
      ]
    })

    //https://docs.amplify.aws/lib/storage/getting-started/q/platform/js/#using-amazon-s3
    props.auth.identityPool.authenticatedRole.attachInlinePolicy(new iam.Policy(this, "authPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
          ],
          resources: [
            bucket.bucketArn + '/public/*',
            bucket.bucketArn + '/protected/${cognito-identity.amazonaws.com:sub}/*',
            bucket.bucketArn + '/private/${cognito-identity.amazonaws.com:sub}/*',
          ],
          effect: iam.Effect.ALLOW,
        }),
        new iam.PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [`arn:aws:s3:::${bucket.bucketName}/uploads/*`],
        }),
        new iam.PolicyStatement({
          actions: ['s3:GetObject'],
          resources: [`arn:aws:s3:::${bucket.bucketName}/protected/*`],
        }),
        new iam.PolicyStatement({
          actions: ['s3:ListBucket'],
          resources: [`arn:aws:s3:::${bucket.bucketName}`],
          conditions: {
            StringLike: {
              's3:prefix': [
                'public/',
                'public/*',
                'protected/',
                'protected/*',
                'private/${cognito-identity.amazonaws.com:sub}/',
                'private/${cognito-identity.amazonaws.com:sub}/*',
              ],
            },
          },
        }),
      ],
    }))

    props.auth.identityPool.unauthenticatedRole.attachInlinePolicy(new iam.Policy(this, "unauthPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          resources: [`${bucket.bucketArn}/public/*`],
        }),
        new iam.PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [`${bucket.bucketArn}/uploads/*`],
        }),
        new iam.PolicyStatement({
          actions: ['s3:GetObject'],
          resources: [`${bucket.bucketArn}/protected/*`],
        }),
        new iam.PolicyStatement({
          actions: ['s3:ListBucket'],
          resources: [bucket.bucketArn],
          conditions: {
            StringLike: {
              's3:prefix': [
                'public/',
                'public/*',
                'protected/',
                'protected/*',
              ],
            },
          },
        }),
      ],
    }))

    this.vals = { bucket }
  }
  
  vals: StorageVals
}
