import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, aws_cognito as cognito } from 'aws-cdk-lib';
import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha'

// Construct Inputs
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

// Construct Outputs (for the UI)
export interface AuthVals {
  userPool: cognito.IUserPool,
  identityPool: IdentityPool,
  webClient: cognito.UserPoolClient
}

export class Auth extends NestedStack {
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    //User and ID pool
    const usrPool = new cognito.UserPool(this, "customers", {
      userPoolName: `${props.appName}-camplify-users`,
      mfa: props.mfa ?? cognito.Mfa.OPTIONAL,
      selfSignUpEnabled: props.selfSignUpEnabled ?? false,
      standardAttributes: props.standardAttributes ?? {
        fullname: { required: true, mutable: true },
        email: { required: true, mutable: true },
        phoneNumber: { required: true, mutable: true },
      },
      customAttributes: props.customAttributes,
      mfaSecondFactor: props.mfaSecondFactor ?? { sms: true, otp: false },
      accountRecovery: props.accountRecovery ?? cognito.AccountRecovery.PHONE_AND_EMAIL
    })
    const webClient = usrPool.addClient("UserPoolWebClient", {
      preventUserExistenceErrors: props.preventUserExistenceErrors ?? true,
      authFlows: { userPassword: true, userSrp: true }
    })
    const idpPool = new IdentityPool(this, "IdentityPool", {
      identityPoolName: `${props.appName}-camplify-identities`,
      allowUnauthenticatedIdentities: props.allowUnauth ?? false
    })
    idpPool.addUserPoolAuthentication(new UserPoolAuthenticationProvider({ userPool: usrPool, userPoolClient: webClient }))

    this.vals = { userPool: usrPool, webClient: webClient, identityPool: idpPool }
  }

  vals: AuthVals
}
