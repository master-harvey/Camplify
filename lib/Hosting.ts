import { Construct } from 'constructs';
import {
    NestedStack, NestedStackProps,
    RemovalPolicy, CfnOutput,
    aws_s3 as s3, aws_cloudfront as cf,
    aws_cloudfront_origins as cfo,
    aws_lambda as lambda,
    aws_certificatemanager as cm,
    aws_route53 as r53,
    aws_secretsmanager as sm,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as cpa,
    aws_codebuild as cbd
} from 'aws-cdk-lib';

import { AuthVals, StorageVals } from '.';

// Construct Inputs
export interface HostingProps extends NestedStackProps {
    appName: string,
    repo: string,
    branch: string,
    gitOwner: string,
    URL?: string,
    customBuildSpec?: cbd.BuildSpec,
    buildEnvironment?: { [key: string]: cbd.BuildEnvironmentVariable },
    camplifyVals?: { //"vals" attribute from each Camplify stack object
        AuthVals?: AuthVals,
        StorageVals?: StorageVals,
    }
}

//All outputs declared as CfnOutputs

export class Hosting extends NestedStack {
    CDK_EXPORTS = {}
    constructor(scope: Construct, id: string, props: HostingProps) {
        super(scope, id);

        //Github creds for pipelines
        const token = sm.Secret.fromSecretNameV2(this, 'githubToken', 'github-token')

        const bucket = new s3.Bucket(this, "InterfaceBucket", {
            bucketName: `${props.appName.toLowerCase()}--interface`,
            websiteIndexDocument: 'index.html',
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        })

        // Distribution
        const oai = new cf.OriginAccessIdentity(this, "OAI", { comment: `${props.appName} OAI` })
        bucket.grantRead(oai)
        let certInput;
        if (props.URL) {
            const zone = new r53.HostedZone(this, "HostedZone", { zoneName: props.URL })
            const cert = new cm.Certificate(this, "Distribution-Cert", {
                domainName: props.URL,
                certificateName: `${props.appName}`,
                validation: cm.CertificateValidation.fromDns(zone)
            })
            certInput = {
                aliases: [props.URL],
                props: {
                    acmCertificateArn: cert.certificateArn,
                    sslSupportMethod: 'sni-only',
                    minimumProtocolVersion: 'TLSv1.1_2016'
                }
            }
        }
        const distribution = new cf.CloudFrontWebDistribution(this, 'Distribution', {
            viewerCertificate: certInput ?? undefined,
            originConfigs: [
                {
                    s3OriginSource: { s3BucketSource: bucket, originAccessIdentity: oai },
                    behaviors: [{ isDefaultBehavior: true }],
                }
            ],
            errorConfigurations: [
                { errorCode: 404, responseCode: 200, responsePagePath: '/index.html' },
            ]
        })

        // Interface Pipeline \\
        const buildPipeline = new codepipeline.Pipeline(this, "InterfaceDeploymentPipeline", {
            pipelineName: `${props.appName}--Interface-Deployment-Pipeline`, crossAccountKeys: false
        })

        const sourceStage = buildPipeline.addStage({ stageName: "Source" })
        const sourceCode = new codepipeline.Artifact()
        const gitSource = new cpa.GitHubSourceAction({
            oauthToken: token.secretValue,
            actionName: `${props.appName}--Pull-Source`,
            owner: props.gitOwner,
            repo: props.repo,
            branch: props.branch,
            output: sourceCode,
            trigger: cpa.GitHubTrigger.WEBHOOK
        })
        sourceStage.addAction(gitSource)

        // Pass public variables to the UI
        let buildVars: { [key: string]: cbd.BuildEnvironmentVariable } = { CDK_REGION: { value: this.region } }
        var customVars = { ...props.buildEnvironment }

        //  prepend custom vars with CDK_
        Object.keys(customVars).forEach(key => buildVars[`CDK_${key.toUpperCase()}`] = customVars[key])

        //  fetch essential vars by name
        if (props.camplifyVals?.AuthVals) {
            buildVars['CDK_UPID'] = { value: props.camplifyVals.AuthVals.userPool.userPoolId }
            buildVars['CDK_WCID'] = { value: props.camplifyVals.AuthVals.webClient.userPoolClientId }
            buildVars['CDK_IDPID'] = { value: props.camplifyVals.AuthVals.identityPool.identityPoolId }
        }
        if (props.camplifyVals?.StorageVals) {
            buildVars['CDK_STORAGEBUCKET'] = { value: props.camplifyVals.StorageVals.bucket.bucketName }
        }
        //  integrate the other stacks here once implemented

        const buildStage = buildPipeline.addStage({ stageName: "Build" })
        const buildProject = new cbd.PipelineProject(this, `${props.appName}--Interface-Build-Project`, {
            projectName: `${props.appName}--Interface-Builder`, concurrentBuildLimit: 1,
            description: `Build the Web Interface for the ${props.appName} pipeline`,
            environment: { buildImage: cbd.LinuxBuildImage.STANDARD_5_0 },
            buildSpec: props.customBuildSpec ?? cbd.BuildSpec.fromAsset('./buildspec.yml'),
            environmentVariables: buildVars
        })

        const builtCode = new codepipeline.Artifact()
        buildStage.addAction(new cpa.CodeBuildAction({
            actionName: `${props.appName}-Interface--Build-Source`,
            project: buildProject,
            input: sourceCode,
            outputs: [builtCode]
        }))

        //const testStage = cPipeline.addStage({ stageName: "Test" })

        const deployStage = buildPipeline.addStage({ stageName: "Deploy" })
        deployStage.addAction(new cpa.S3DeployAction({
            actionName: `${props.appName}-S3Deploy`,
            bucket: bucket,
            input: builtCode
        }))

        // Lambda that will invalidate the cache
        const invalidateCacheLambda = new lambda.Function(this, "invalidate", {
            functionName: `${props.appName}--Interface-Invalidator`, handler: "index.handler",
            code: lambda.Code.fromInline(invalidateFunctionCode), runtime: lambda.Runtime.NODEJS_18_X
        })
        const CIinvalidateStage = buildPipeline.addStage({
            stageName: 'InvalidateCloudfrontCache',
            actions: [new cpa.LambdaInvokeAction({ actionName: 'InvalidateCache', lambda: invalidateCacheLambda })]
        });
        // Interface Pipeline \\

        new CfnOutput(this, "Dist URL", { value: distribution.distributionDomainName, description: `${props.appName} Interface Distribution URL` })
        //Prune vars object to a single layer for the user
        const prunedVars = Object.entries(buildVars).reduce((acc: {[key: string]: string}, [key, value]) => {
            const newKey = key.replace('CDK_', '');
            acc[newKey] = value.value;
            return acc;
        }, {});
        new CfnOutput(this, "cdkExports", { value: JSON.stringify(prunedVars), description: "cdk-exports.json" })
        this.CDK_EXPORTS = prunedVars
    }
}

const invalidateFunctionCode = `\
const AWS = require('aws-sdk')

exports.handler = function (event, context) {
    const cloudfront = new AWS.CloudFront()
    return cloudfront.createInvalidation({
        DistributionId: process.env.CLOUDFRONT_ID,
        InvalidationBatch: {
            CallerReference: new Date().getTime().toString(),
            Paths: { Quantity: 1, Items: ['*'] }
        }
    })
}\
`