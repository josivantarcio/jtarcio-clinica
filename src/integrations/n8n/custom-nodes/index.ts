/**
 * Custom N8N Nodes for EO Clínica Integration
 * Exports all custom nodes for registration with N8N
 */

export * from './EoClinicaApi.node';

// Package.json configuration for N8N custom nodes
export const customNodesPackage = {
  name: '@eo-clinica/n8n-nodes',
  version: '1.0.0',
  description: 'Custom N8N nodes for EO Clínica medical scheduling system',
  main: 'index.js',
  scripts: {
    build: 'tsc && npm run copy:icons',
    'copy:icons': 'cp -R icons dist/',
    dev: 'tsc --watch',
    format: 'prettier --write .',
  },
  keywords: [
    'n8n',
    'n8n-community-node-package',
    'eo-clinica',
    'medical',
    'scheduling',
  ],
  files: ['dist'],
  n8n: {
    n8nNodesApiVersion: 1,
    credentials: ['dist/credentials/EoClinicaApi.credentials.js'],
    nodes: ['dist/nodes/EoClinicaApi.node.js'],
  },
  devDependencies: {
    'n8n-workflow': '^1.0.0',
    typescript: '^5.0.0',
  },
  peerDependencies: {
    'n8n-workflow': '^1.0.0',
  },
};

// Node registration configuration
export const nodeRegistration = {
  credentials: {
    eoClinicaApi: {
      class: 'EoClinicaApi',
      sourcePath: './credentials/EoClinicaApi.credentials',
    },
  },
  nodes: {
    eoClinicaApi: {
      class: 'EoClinicaApi',
      sourcePath: './nodes/EoClinicaApi.node',
    },
  },
};
