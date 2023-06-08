# Camplify - CDK Constructs for Amplify Libraries

Camplify is a collection of CDK constructs that make it easy to use Amplify Libraries in your CDK projects.

Each construct has a 'vals' property that can be used with other constructs (Ex. In order to use Storage with Auth) If these vals are used with the hosting construct then the variables that the Amplify UI libraries require are automatically passed to your deployed front end via the sample buildspec for React.

Pull Requests are Welcome!

# Example

These examples are also in the node_modules folder after installation (npm i camplify)

The sampleUsage.ts file shows how to setup your amplify project:

```
import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
// @ts-ignore
import { Auth, Storage, Hosting } from 'camplify'

export class YourStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const appName = "Test"
        const Authentication = new Auth(this, "Authentication", { appName })
        const AppStorage = new Storage(this, "AppStorage", { appName, auth: Authentication.vals })
        //Other Camplify stacks as necessary

        // Your business logic infrastructure //

        const FrontEnd = new Hosting(this, "Hosting", {
            appName, repo: "Camplify", branch: "demo", gitOwner: "master-harvey",
            URL: "yoururl.com",
            buildEnvironment: { //Custom Env Vars passed to frontend
                key1: { value: "value" },
                key2: { value: "value" }
            },
            camplifyVals: {
                AuthVals: Authentication.vals,
                StorageVals: AppStorage.vals
            }
        })
        new CfnOutput(this, "CDK-Exports", { value: FrontEnd.CDK_EXPORTS })
    }
}
```

If you use the Hosting construct you can configure Amplify like this using the cdk-exports.json file generated during the build:

```
import { Amplify } from 'aws-amplify';
import awsExports from './cdk-exports.json';

Amplify.configure({
  aws_project_region: awsExports.REGION,
  Auth: {
    identityPoolId: awsExports.IDPID,
    region: awsExports.REGION,
    userPoolId: awsExports.UPID,
    userPoolWebClientId: awsExports.WCID,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    oauth: {
      domain: 'your_cognito_domain',
      scope: [
        'phone',
        'email',
        'profile',
        'openid',
        'aws.cognito.signin.user.admin'
      ],
      clientId: awsExports.WCID,
      responseType: 'code'
    }
  },
  Storage: {
    AWSS3: {
      bucket: awsExports.STORAGEBUCKET,
      region: awsExports.REGION
    }
  }
});
```

# Input Interfaces

Auth

```
export interface AuthProps extends NestedStackProps {
  appName: string,
  allowUnauth?: boolean,
  selfSignUpEnabled?: boolean,
  mfa?: cognito.Mfa,
  preventUserExistenceErrors?: boolean,
  mfaSecondFactor?: { sms: boolean, otp: boolean },
  accountRecovery?: cognito.AccountRecovery,
  standardAttributes?: { [key: string]: cognito.StandardAttribute },
  customAttributes?: { [key: string]: cognito.ICustomAttribute },
}
```

Storage

```
export interface StorageProps extends NestedStackProps {
  appName: string,
  auth: AuthVals,
  cors?: [s3.CorsRule],
  allowedOrigins?: [string],
  removalPolicy?: RemovalPolicy
}
```

Hosting (Built only for React at the moment)

```
export interface HostingProps extends NestedStackProps {
    appName: string,
    repo: string,
    branch: string,
    gitOwner: string,
    URL?: string,
    customBuildSpec?: cbd.BuildSpec,
    buildEnvironment?: { [key: string]: cbd.BuildEnvironmentVariable },
    camplifyVals?: {
        AuthVals?: AuthVals,
        StorageVals?: StorageVals,
    }
}
```
