import { Config } from '@algorandfoundation/algokit-utils'
import { registerDebugEventHandlers } from '@algorandfoundation/algokit-utils-debug'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { Address } from 'algosdk'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { CardlessIssuer } from '../CardlessIssuer/contract.algo'

describe('CardlessIssuer contract', () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      debug: true,
      // traceAll: true,
    })
    registerDebugEventHandlers()
  })
  beforeEach(localnet.newScope)

  const deploy = async (account: Address) => {
    const factory = localnet.algorand.client.getTypedAppFactory(CardlessIssuer, {
      defaultSender: account,
    })

    const { appClient } = await factory.deploy({
      onUpdate: 'append',
      onSchemaBreak: 'append',
    })
    return { client: appClient }
  }

  test('initializes with admin as creator', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const globalState = await client.getGlobalState()
    expect(globalState.admin!.asAddress()).toBe(testAccount)
    expect(globalState.issuerCount!.asNumber()).toBe(0)
  })

  describe('Adding issuers', () => {
    test('admin can add an issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(1)

      const isAuth = await client.send.isAuthorized({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })
      expect(isAuth.return).toBe(true)
    })

    test('stores issuer info correctly', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()
      const issuerName = 'MIT'

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: issuerName },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const info = await client.send.getIssuerInfo({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      expect(info.return!.name).toBe(issuerName)
      expect(info.return!.isActive).toBe(true)
      expect(info.return!.addedAt).toBeGreaterThan(0n)
    })

    test('rejects duplicate issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      await expect(
        client.send.addIssuer({
          args: { issuerAddress: issuerAccount.addr, name: 'Test University 2' },
          boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
        }),
      ).rejects.toThrow()
    })

    test('rejects non-admin adding issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const nonAdmin = localnet.algorand.account.random()
      const issuerAccount = localnet.algorand.account.random()

      await expect(
        client.send.addIssuer({
          args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
          sender: nonAdmin.addr,
          boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
        }),
      ).rejects.toThrow()
    })
  })

  describe('Removing issuers', () => {
    test('admin can remove an issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      let globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(1)

      await client.send.removeIssuer({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(0)

      const isAuth = await client.send.isAuthorized({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })
      expect(isAuth.return).toBe(false)
    })

    test('marks issuer as inactive (audit trail)', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()
      const issuerName = 'Test University'

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: issuerName },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      await client.send.removeIssuer({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const info = await client.send.getIssuerInfo({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      expect(info.return!.isActive).toBe(false)
      expect(info.return!.name).toBe(issuerName)
    })

    test('rejects removing non-existent issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await expect(
        client.send.removeIssuer({
          args: { issuerAddress: issuerAccount.addr },
          boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
        }),
      ).rejects.toThrow()
    })

    test('rejects non-admin removing issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()
      const nonAdmin = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      await expect(
        client.send.removeIssuer({
          args: { issuerAddress: issuerAccount.addr },
          sender: nonAdmin.addr,
          boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
        }),
      ).rejects.toThrow()
    })
  })

  describe('Authorization checks', () => {
    test('returns true for active issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const isAuth = await client.send.isAuthorized({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      expect(isAuth.return).toBe(true)
    })

    test('returns false for removed issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      await client.send.removeIssuer({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const isAuth = await client.send.isAuthorized({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      expect(isAuth.return).toBe(false)
    })

    test('returns false for non-existent issuer', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuerAccount = localnet.algorand.account.random()

      const isAuth = await client.send.isAuthorized({
        args: { issuerAddress: issuerAccount.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      expect(isAuth.return).toBe(false)
    })
  })

  describe('Admin transfer', () => {
    test('admin can transfer admin rights', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const newAdmin = localnet.algorand.account.random()

      await client.send.transferAdmin({
        args: { newAdmin: newAdmin.addr },
      })

      const globalState = await client.getGlobalState()
      expect(globalState.admin!.asAddress()).toBe(newAdmin.addr)
    })

    test('new admin can add issuers', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const newAdmin = localnet.algorand.account.random()
      const issuerAccount = localnet.algorand.account.random()

      // Transfer admin to new account
      await client.send.transferAdmin({
        args: { newAdmin: newAdmin.addr },
      })

      // Fund the new admin account
      await localnet.algorand.send.payment({
        sender: testAccount,
        receiver: newAdmin.addr,
        amount: (1000000).microAlgos(),
      })

      // New admin adds an issuer
      await client.send.addIssuer({
        args: { issuerAddress: issuerAccount.addr, name: 'Test University' },
        sender: newAdmin.addr,
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuerAccount.addr }],
      })

      const globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(1)
    })

    test('rejects non-admin transferring admin rights', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const nonAdmin = localnet.algorand.account.random()
      const newAdmin = localnet.algorand.account.random()

      await expect(
        client.send.transferAdmin({
          args: { newAdmin: newAdmin.addr },
          sender: nonAdmin.addr,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Multiple issuers', () => {
    test('can manage multiple issuers', async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const issuer1 = localnet.algorand.account.random()
      const issuer2 = localnet.algorand.account.random()
      const issuer3 = localnet.algorand.account.random()

      // Add three issuers
      await client.send.addIssuer({
        args: { issuerAddress: issuer1.addr, name: 'MIT' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer1.addr }],
      })

      await client.send.addIssuer({
        args: { issuerAddress: issuer2.addr, name: 'Stanford' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer2.addr }],
      })

      await client.send.addIssuer({
        args: { issuerAddress: issuer3.addr, name: 'Harvard' },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer3.addr }],
      })

      let globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(3)

      // Remove one issuer
      await client.send.removeIssuer({
        args: { issuerAddress: issuer2.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer2.addr }],
      })

      globalState = await client.getGlobalState()
      expect(globalState.issuerCount!.asNumber()).toBe(2)

      // Verify authorization status
      const auth1 = await client.send.isAuthorized({
        args: { issuerAddress: issuer1.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer1.addr }],
      })
      expect(auth1.return).toBe(true)

      const auth2 = await client.send.isAuthorized({
        args: { issuerAddress: issuer2.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer2.addr }],
      })
      expect(auth2.return).toBe(false)

      const auth3 = await client.send.isAuthorized({
        args: { issuerAddress: issuer3.addr },
        boxReferences: [{ appId: BigInt((await client.appClient.getAppReference()).appId), name: issuer3.addr }],
      })
      expect(auth3.return).toBe(true)
    })
  })
})
