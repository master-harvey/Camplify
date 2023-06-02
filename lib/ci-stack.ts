import {
  Stack, StackProps,
  aws_codepipeline as codepipeline,
  aws_codebuild as codebuild,
  aws_secretsmanager as sm,
  aws_apigateway as apigw,
  aws_codepipeline_actions as cpa,
  aws_iam as iam
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CamplifyCiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Github creds for pipelines
    const token = sm.Secret.fromSecretNameV2(this, 'githubToken', 'github-token')

    // Version Pipeline \\
    const versionPipeline = new codepipeline.Pipeline(this, "InterfaceDeploymentPipeline", { pipelineName: `Camplify-Version-Tracker` })

    const sourceStage = versionPipeline.addStage({ stageName: "Source" })
    const sourceCode = new codepipeline.Artifact()
    const gitSource = new cpa.GitHubSourceAction({
      oauthToken: token.secretValue,
      actionName: `Camplify-Versions--Pull-Source`,
      owner: "master-harvey",
      repo: "Camplify",
      branch: "CI",
      output: sourceCode,
      trigger: cpa.GitHubTrigger.WEBHOOK
    })
    sourceStage.addAction(gitSource)

    // Pass public variables to the UI

    const buildStage = versionPipeline.addStage({ stageName: "Build" })
    const buildProject = new codebuild.PipelineProject(this, `Camplify-Versions-Build-Project`, {
      projectName: `Camplify-Versions-Builder`, concurrentBuildLimit: 1,
      description: `Match the camplify construct version to the CDK version number for compatibility`,
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_5_0 },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml(BuildSpec),
    })

    const builtCode = new codepipeline.Artifact()
    buildStage.addAction(new cpa.CodeBuildAction({
      actionName: `Camplify--Build-Source`,
      project: buildProject,
      input: sourceCode,
      outputs: [builtCode]
    }))

    //check version number and run a compilation of the 'test' branch
    const testStage = versionPipeline.addStage({ stageName: "Test" })

    const deployStage = versionPipeline.addStage({ stageName: "Deploy" })
    // Version Pipeline \\


    //IAM role that codebuild will use to work with CF
    const constructionRole = new iam.Role(this, 'Market-Manager--Construction', {
      roleName: 'Market-Manager--Construction',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      description: "Allows codebuild to use cloudformation"
    })
    constructionRole.grantAssumeRole(new iam.ServicePrincipal('codepipeline.amazonaws.com')) //for cdk pipeline use
    constructionRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['cloudformation:*'],
      resources: ["arn:aws:cloudformation:*:875106437592:stack/*/*"]
    }))
    constructionRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['ecr:*'],
      resources: ["*"]
    }))
    constructionRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ["arn:aws:ssm:us-east-2:875106437592:*/*"]
    }))
    constructionRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-cfn-exec-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-deploy-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-file-publishing-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-image-publishing-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-lookup-role-875106437592-us-east-2'
      ]
    }))

    //CodeBuild project, will be fed env variables to deploy new markets
    const versionTrackerProject = new codebuild.Project(this, 'CreateMarkets', {
      projectName: 'Market-Factory',
      description: 'Creates market stacks',
      source: codebuild.Source.gitHub({ owner: 'MastersAutomation', repo: 'market', branchOrRef: 'Market-Infra_Prod' }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true
      },
      role: constructionRole
    })

    //Create REST API
    const api = new apigw.RestApi(this, "Market-Manager", {
      restApiName: "Market-Manager",
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
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
        allowOrigins: ['*']
      }
    });

    //Api Model definitions
    const modelRequest = api.addModel("createMarketRequestModel", {
      modelName: "createModelRequest",
      schema: { type: apigw.JsonSchemaType.ARRAY }
    })
    const modelResponse = api.addModel("createMarketResponseModel", {
      modelName: "createModelResponse",
      schema: {
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          "method.response.header.Access-Control-Allow-Origin": { type: apigw.JsonSchemaType.STRING },
          "method.response.body.build.buildStatus": { type: apigw.JsonSchemaType.OBJECT }
        },
      }
    })

    //IAM role that API GW will assume to work with codebuild
    const formationRole = new iam.Role(this, 'Market-Manager--Formation', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: "Allows API GW to create and destroy stacks with codebuild"
    })
    formationRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['codebuild:StartBuild'],
      resources: [versionTrackerProject.projectArn]
    }))
    formationRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['cloudformation:DeleteStack'],
      resources: ['*']
    }))
    formationRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-cfn-exec-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-deploy-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-file-publishing-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-image-publishing-role-875106437592-us-east-2',
        'arn:aws:iam::875106437592:role/cdk-hnb659fds-lookup-role-875106437592-us-east-2'
      ]
    }))

    //method integrations
    const trackerResource = api.root.addResource('tracker')
    const trackerMethod = trackerResource.addMethod('PUT', new apigw.AwsIntegration({
      service: "codepipeline",
      action: "StartPipelineExecution",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: formationRole,
        requestParameters: {
          "integration.request.querystring.version": "'2016-10-06'",
          "integration.request.header.Content-Type": "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target": "'CodePipeline_20161006.StartPipelineExecution'"
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

const BuildSpec = {
  version: 0.2,
  phases: {
    install: {
      commands: ["npm i"]
    },
    pre_build: {
      commands: ["npm update"]
    },
    build: {
      commands: ["npm run build"]
    },
    post_build: {
      commands: ["npm version patch"]
    }
  },
  artifacts: {
    baseDirectory: "dist",
    files: "**/*"
  }
}