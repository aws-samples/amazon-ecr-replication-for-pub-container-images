#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { PubImagesMirrorStack } from '../lib/pub-images-mirror-stack';

const app = new cdk.App();
new PubImagesMirrorStack(app, 'PubImagesMirrorStack');
