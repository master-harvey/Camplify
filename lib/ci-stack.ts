import {
  Stack, StackProps,
  aws_codepipeline as codepipeline,
  aws_codebuild as codebuild,
  aws_secretsmanager as sm,
  aws_apigateway as apigw,
  aws_codepipeline_actions as cpa,
  aws_iam as iam,
  aws_ssm as ssm
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CamplifyCiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Github and NPM creds for pipeline
    const gitToken = sm.Secret.fromSecretNameV2(this, 'githubToken', 'github-token')
    const npmToken = ssm.StringParameter.valueForStringParameter(this, 'Camplify-NPM-Access-Token')

    // Version Pipeline \\
    const versionPipeline = new codepipeline.Pipeline(this, "VersionTrackerPipeline", { pipelineName: `Camplify-Version-Tracker` })

    const sourceStage = versionPipeline.addStage({ stageName: "Source" })
    const sourceCode = new codepipeline.Artifact()
    const gitSource = new cpa.GitHubSourceAction({
      oauthToken: gitToken.secretValue,
      actionName: `Camplify-Versions--Pull-Source`,
      owner: "master-harvey",
      repo: "Camplify",
      branch: "CDKV2",
      output: sourceCode,
      trigger: cpa.GitHubTrigger.WEBHOOK
    })
    sourceStage.addAction(gitSource)

    const buildStage = versionPipeline.addStage({ stageName: "Build" })
    const BuildSpec = {
      version: 0.2,
      phases: {
        install: {
          commands: ["npm ci", "npm update"]
        },
        build: {
          commands: ["npm run build"]
        },
        post_build: {
          commands: [
            `npm config set _auth=${npmToken}`,
            "chmod +x version_check.sh",
            "./version_check.sh"
          ]
        }
      }
    }
    const buildProject = new codebuild.PipelineProject(this, `Camplify-Versions-Build-Project`, {
      projectName: `Camplify-Versions-Builder`, concurrentBuildLimit: 1,
      description: `Update Camplify version to match CDK for compatibility`,
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_5_0 },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml(BuildSpec),
    })
    buildProject.addSecondaryArtifact

    const builtCode = new codepipeline.Artifact()
    buildStage.addAction(new cpa.CodeBuildAction({
      actionName: `Camplify--Build-and-Publish`,
      project: buildProject,
      input: sourceCode,
      outputs: [builtCode]
    }))
    // Version Pipeline \\

    //Create REST API
    const api = new apigw.RestApi(this, "Market-Manager", {
      restApiName: "Camplify-Version-Tracker",
      description: "Manages instances of the Master's Market Environment",
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ],
        allowCredentials: true,
        allowMethods: ['POST'],
        allowOrigins: ['*']
      }
    });

    //Api Model definitions
    const modelRequest = api.addModel("startMarketRequestModel", {
      modelName: "startModelRequest",
      schema: { type: apigw.JsonSchemaType.OBJECT }
    })
    const modelResponse = api.addModel("startMarketResponseModel", {
      modelName: "startModelResponse",
      schema: {
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          "method.response.header.Access-Control-Allow-Origin": { type: apigw.JsonSchemaType.STRING },
          "method.response.body.pipelineExecutionId": { type: apigw.JsonSchemaType.OBJECT }
        },
      }
    })

    //IAM role that API GW will assume to work with codepipeline
    const pipelineRole = new iam.Role(this, 'CamplifyVersionTrackerPipelineRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: "Allows API GW to start the pipeline"
    })
    pipelineRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['codepipeline:StartPipelineExecution'],
      resources: [versionPipeline.pipelineArn]
    }))

    //method integrations
    const trackerResource = api.root.addResource('track')
    const trackerMethod = trackerResource.addMethod('POST', new apigw.AwsIntegration({
      service: "codepipeline",
      action: "StartPipelineExecution",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: pipelineRole,
        requestParameters: {
          "integration.request.querystring.version": "'2015-07-09'",
          "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target": "'CodePipeline_20150709.StartPipelineExecution'"
        },
        requestTemplates: {
          "application/json": `{ "name":"${versionPipeline.pipelineName}" }`
        },
        integrationResponses: [{ statusCode: '200', selectionPattern: '2\\d{2}' }],
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES
      }
    }),
      {
        operationName: "CamplifyUpdate",
        requestModels: { "application/json": modelRequest },
        methodResponses: [{ statusCode: '200' }]
      }
    )

  }
}