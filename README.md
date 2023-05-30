# Camplify - CDK Constructs for Amplify Libraries

Camplify is a collection of CDK constructs that make it easy to use Amplify Libraries in your CDK projects.

Each construct has a 'vals' property that can be used with other constructs (Ex. In order to use Storage with Auth) If these vals are used with the hosting construct then the variables that the Amplify UI libraries require are automatically passed to your deployed front end via the sample buildspec for React.
