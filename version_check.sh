#!/bin/bash

#If Minor versions are equal, increase camplify patch version (third decimal) (new camplify or minor cdk patch),
#else make the minor version match w/ patch #0 (new minor CDK lib).

# Get the current versions
cdk_version=$(npm show aws-cdk-lib version)
camplify_version=$(npm show camplify version)

# Get the major, minor, and patch versions
cdk_major=$(echo $cdk_version | cut -d. -f1)
cdk_minor=$(echo $cdk_version | cut -d. -f2)
cdk_patch=$(echo $cdk_version | cut -d. -f3)
echo cdk_minor

camplify_major=$(echo $camplify_version | cut -d. -f1)
camplify_minor=$(echo $camplify_version | cut -d. -f2)
camplify_patch=$(echo $camplify_version | cut -d. -f3)
echo camplify_minor

# Check if the major version of aws-cdk-lib is 3
if [ $cdk_major -eq 3 ]; then
  echo "ALERT: CDKV3 has been released!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
fi

# Check if the minor versions are equal
if [ $cdk_minor -eq $camplify_minor ]; then
  # Increase the camplify patch version
  npm version patch
else
  # Make the camplify minor version match aws-cdk-lib with patch number 0
  new_version="${cdk_major}.${cdk_minor}.0"
  npm version $new_version
fi
