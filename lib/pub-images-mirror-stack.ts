import { Construct } from 'constructs';
import { App, Stack } from 'aws-cdk-lib';

import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as iam from 'aws-cdk-lib/aws-iam';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';

export class PubImagesMirrorStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const targetRegion = new cdk.CfnParameter(this, "targetRegion", {
      type: "String",
      description: "The target region to push image to target ECR."
    });

    const targetRegionAK = new cdk.CfnParameter(this, "targetRegionAK", {
      type: "String",
      noEcho: true,
      description: "The IAM access key to push image to target ECR."
    });

    const targetRegionSK = new cdk.CfnParameter(this, "targetRegionSK", {
      type: "String",
      noEcho: true,
      description: "The IAM secret key to push image to target ECR."
    });

    const targetRegionParam = new secretsmanager.CfnSecret(this, 'targetECRSecert', {
      name: '/pub-image-mirror/target-region-param',
      secretString: `{"targetRegion": "${targetRegion.valueAsString}", "targetRegionAK": "${targetRegionAK.valueAsString}", "targetRegionSK": "${targetRegionSK.valueAsString}"}`
    });

    const asset = new assets.Asset(this, 'buildspecAsset', {
      path: path.join(__dirname, '../buildspec'),
    });

    const cfnRepository = new codecommit.CfnRepository(this, 'cfnCodeRepo', {
      repositoryName: 'pub-images-mirror',
      code: {
        s3: {
          bucket: asset.s3BucketName,
          key: asset.s3ObjectKey
        }
      }
    });
    const repository = codecommit.Repository.fromRepositoryArn(this, 'codeRepo', cfnRepository.attrArn);

    const project = new codebuild.Project(this, 'PubImageMirrorProject', {
      environment: {
        computeType: codebuild.ComputeType.SMALL,
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true
      },
      source: codebuild.Source.codeCommit({ repository }),
    });
    project.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          targetRegionParam.ref
        ],
      }),
    );
    repository.onCommit('OnCommit', {
      target: new targets.CodeBuildProject(project),
    });
  }
}
