import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Auth, Storage, Hosting } from 'camplify'

export class YourStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const appName = "Test"
        const Authentication = new Auth(this, "Authentication", { appName })
        const AppStorage = new Storage(this, "AppStorage", { appName, auth: Authentication.vals })
        //Other Camplify stacks as necessary

        // Your business logic infrastructure //

        const FrontEnd = new Hosting(this, "Hosting", {
            appName, repo: "Camplify", branch: "demo", gitOwner: "master-harvey",
            URL: "camplifydemo.m-a.cloud",
            buildEnvironment: { //Custom Env Vars passed to frontend
                key1: { value: "value" },
                key2: { value: "value" }
            },
            camplifyVals: {
                AuthVals: Authentication.vals,
                StorageVals: AppStorage.vals
            }
        })
    }
}