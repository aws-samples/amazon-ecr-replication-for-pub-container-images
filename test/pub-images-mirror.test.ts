import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as PubImagesMirror from '../lib/pub-images-mirror-stack';

test('CodeCommit Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new PubImagesMirror.PubImagesMirrorStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(haveResource("AWS::CodeCommit::Repository",{
      RepositoryName: "pub-images-mirror"
    }));
});

test('CodeBuild Project Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new PubImagesMirror.PubImagesMirrorStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource("AWS::CodeBuild::Project"));
});
