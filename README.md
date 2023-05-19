# Camplify - CDK Constructs for Amplify Libraries

Camplify is a collection of CDK constructs that make it easy to use Amplify Libraries in your CDK projects.

Each construct has a 'vals' property that can be used with other constructs (Ex. In order to use Storage with Auth)

Transfer these vals to your UI through env vars and create a faux aws-exports file before building the UI (put one of these in your buildspec.yml pre_build section):

- Using jq to automatically export lots of variables prefixed "CDK_":

`- "env | grep '^CDK_' | jq -Rn 'inputs | split("=") | {(.[0]): (.[1])}' > variables.json"`

- Or directly for only a few variables (or without installing jq):

`- "echo '{\"VAR1\":\"'$VAR1'\", \"VAR2\":\"'$VAR2'\", ...}' >> cdk-exports.json"`

`- "echo '{\"VAR1\":\"'$VAR1'\", \"VAR2\":\"'$VAR2'\", ...}' "` (Echo to logs)
