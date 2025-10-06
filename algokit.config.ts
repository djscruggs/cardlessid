import { AlgoKitConfig } from '@algorandfoundation/algokit-client-generator'

const config: AlgoKitConfig = {
  contracts: [
    {
      name: 'IssuerRegistry',
      path: './app/contracts/issuer-registry.py',
      output: './app/contracts/generated',
    },
  ],
}

export default config
