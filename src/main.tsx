import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
