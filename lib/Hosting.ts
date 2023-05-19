import { Construct } from 'constructs';
import {
    NestedStack, NestedStackProps,
    RemovalPolicy, CfnOutput, Duration,
    aws_s3 as s3, aws_cloudfront as cf,
    aws_cloudfront_origins as cfo,
    aws_certificatemanager as cm,
    aws_lambda as lambda,
    aws_route53 as r53,
    aws_secretsmanager as sm,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as cpa,
    aws_codebuild as cbd,
} from 'aws-cdk-lib';

// Construct Inputs
export interface HostingProps extends NestedStackProps {
    appName: string,
    URL: string,
    repo: string,
    branch: string,
    gitOwner: string,
    buildEnvironment?: { [name: string]: cbd.BuildEnvironmentVariable }
}

//All outputs declared as CfnOutputs

export class Analytics extends NestedStack {
    constructor(scope: Construct, id: string, props: HostingProps) {
        super(scope, id);

        //Github creds for pipelines
        const token = sm.Secret.fromSecretNameV2(this, 'githubToken', 'github-token')

        const bucket = new s3.Bucket(this, "InterfaceBucket", {
            bucketName: `${props.appName}--interface`,
            websiteIndexDocument: 'index.html',
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        })

        // Distribution
        const oai = new cf.OriginAccessIdentity(this, "OAI", { comment: `${props.appName} OAI` })
        bucket.grantRead(oai)
        const zone = new r53.HostedZone(this, "HostedZone", { zoneName: props.URL })
        const cert = new cm.Certificate(this, "Distribution-Cert", {
            domainName: props.URL,
            certificateName: `${props.appName}`,
            validation: cm.CertificateValidation.fromDns(zone)
        })
        const distribution = new cf.CloudFrontWebDistribution(this, 'Distribution', {
            viewerCertificate: {
                aliases: [props.URL],
                props: {
                    acmCertificateArn: cert.certificateArn,
                    sslSupportMethod: 'sni-only',
                    minimumProtocolVersion: 'TLSv1.1_2016'
                }
            },
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
        new CfnOutput(this, "Dist URL", { value: distribution.distributionDomainName, description: `${props.appName} Interface Distribution URL` })

        // Interface Pipeline \\
        const buildPipeline = new codepipeline.Pipeline(this, "InterfaceDeploymentPipeline", {
            pipelineName: `${props.appName}--Interface-Deployment-Pipeline`,
            crossAccountKeys: false,
            artifactBucket: bucket
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

        const buildStage = buildPipeline.addStage({ stageName: "Build" })
        const buildProject = new cbd.PipelineProject(this, `${props.appName}--Interface-Build-Project`, {
            projectName: `${props.appName}--Interface-Builder`, concurrentBuildLimit: 1,
            description: `Build the Web Interface for the ${props.appName} pipeline`,
            environment: { buildImage: cbd.LinuxBuildImage.STANDARD_5_0 },
            environmentVariables: props.buildEnvironment
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

        // Create the build project that will invalidate the cache
        const invalidateBuildProject = new cbd.PipelineProject(this, `InvalidateProject`, {
            projectName: `${props.appName}-invalidate`, description: `Invalidate ${props.appName} Interface distribution`,
            buildSpec: cbd.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/*"',
                        ],
                    },
                },
            }),
            environmentVariables: {
                CLOUDFRONT_ID: { value: distribution.distributionId },
            },
        });
        deployStage.addAction(new cpa.CodeBuildAction({
            actionName: 'InvalidateCache',
            project: invalidateBuildProject,
            input: builtCode,
            runOrder: 2,
        }))
        // Interface Pipeline \\
        new CfnOutput(this, "Dist URL", { value: distribution.distributionDomainName, description: "Distribution URL" })
    }
}
