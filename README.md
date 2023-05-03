# Camplify - CDK Constructs for Amplify Libraries

Camplify is a collection of CDK constructs that make it easy to use Amplify Libraries in your CDK projects.


Each construct has a 'vals' property that can be used with other constructs (Ex. In order to use Storage with Auth)

Transfer these vals to your UI through env vars and create a faux aws-exports file before building the UI:

`pre_build:`

`	commands:`

`		- "echo '{\"VAR1\":\"'$VAR1'\", \"VAR2\":\"'$VAR2'\", ...}'"`

`		- "echo '{\"VAR1\":\"'$VAR1'\", \"VAR2\":\"'$VAR2'\", ...}' >> cdk-exports.json"`
