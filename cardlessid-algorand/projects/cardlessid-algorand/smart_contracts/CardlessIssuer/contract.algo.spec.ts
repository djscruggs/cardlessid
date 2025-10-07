import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { afterEach, describe, expect, it } from 'vitest'
import { CardlessIssuer } from './contract.algo'

describe('CardlessIssuer contract', () => {
  const ctx = new TestExecutionContext()

  afterEach(() => {
    ctx.reset()
  })

  const createContract = () => {
    const contract = ctx.contract.create(CardlessIssuer)
    contract.createApplication()
    return contract
  }

  it('can create the contract', () => {
    const contract = createContract()

    expect(contract).toBeDefined()
    expect(contract.issuerCount.value).toEqual(0)
  })

  describe('createApplication', () => {
    it('sets the admin to the sender', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount

      const contract = createContract()

      expect(contract.admin.value).toBe(adminAccount)
    })

    it('initializes issuerCount to 0', () => {
      const contract = createContract()

      expect(contract.issuerCount.value).toEqual(0)
    })
  })

  describe('addIssuer', () => {
    it('allows admin to add a new issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      expect(contract.issuerCount.value).toEqual(1)
      expect(contract.isAuthorized(issuerAccount)).toBe(true)
    })

    it('stores issuer info correctly', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      const issuerInfo = contract.getIssuerInfo(issuerAccount)
      expect(issuerInfo.name.native).toBe('Test Issuer')
      expect(issuerInfo.url.native).toBe('https://example.com')
      expect(issuerInfo.isActive.native).toBe(true)
    })

    it('rejects non-admin attempts to add issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const nonAdminAccount = ctx.any.account()
      ctx.defaultSender = nonAdminAccount

      const issuerAccount = ctx.any.account()
      expect(() => {
        contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      }).toThrow('Only admin can add issuers')
    })

    it('rejects adding duplicate issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      expect(() => {
        contract.addIssuer(issuerAccount, 'Duplicate Issuer', 'https://example2.com')
      }).toThrow('Issuer already exists')
    })

    it('increments issuerCount for each new issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuer1 = ctx.any.account()
      const issuer2 = ctx.any.account()
      const issuer3 = ctx.any.account()

      contract.addIssuer(issuer1, 'Issuer 1', 'https://issuer1.com')
      expect(contract.issuerCount.value).toEqual(1)

      contract.addIssuer(issuer2, 'Issuer 2', 'https://issuer2.com')
      expect(contract.issuerCount.value).toEqual(2)

      contract.addIssuer(issuer3, 'Issuer 3', 'https://issuer3.com')
      expect(contract.issuerCount.value).toEqual(3)
    })
  })

  describe('removeIssuer', () => {
    it('allows admin to remove an existing issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      expect(contract.issuerCount.value).toEqual(1)

      contract.removeIssuer(issuerAccount)
      expect(contract.issuerCount.value).toEqual(0)
      expect(contract.isAuthorized(issuerAccount)).toBe(false)
    })

    it('marks issuer as inactive instead of deleting', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      contract.removeIssuer(issuerAccount)

      const issuerInfo = contract.getIssuerInfo(issuerAccount)
      expect(issuerInfo.isActive.native).toBe(false)
      expect(issuerInfo.name.native).toBe('Test Issuer')
    })

    it('rejects non-admin attempts to remove issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      const nonAdminAccount = ctx.any.account()
      ctx.defaultSender = nonAdminAccount

      expect(() => {
        contract.removeIssuer(issuerAccount)
      }).toThrow('Only admin can remove issuers')
    })

    it('rejects removing non-existent issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()

      expect(() => {
        contract.removeIssuer(issuerAccount)
      }).toThrow('Issuer does not exist')
    })

    it('decrements issuerCount', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuer1 = ctx.any.account()
      const issuer2 = ctx.any.account()

      contract.addIssuer(issuer1, 'Issuer 1', 'https://issuer1.com')
      contract.addIssuer(issuer2, 'Issuer 2', 'https://issuer2.com')
      expect(contract.issuerCount.value).toEqual(2)

      contract.removeIssuer(issuer1)
      expect(contract.issuerCount.value).toEqual(1)

      contract.removeIssuer(issuer2)
      expect(contract.issuerCount.value).toEqual(0)
    })
  })

  describe('isAuthorized', () => {
    it('returns true for active issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      expect(contract.isAuthorized(issuerAccount)).toBe(true)
    })

    it('returns false for inactive issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      contract.removeIssuer(issuerAccount)

      expect(contract.isAuthorized(issuerAccount)).toBe(false)
    })

    it('returns false for non-existent issuer', () => {
      const contract = createContract()

      const issuerAccount = ctx.any.account()

      expect(contract.isAuthorized(issuerAccount)).toBe(false)
    })
  })

  describe('getIssuerInfo', () => {
    it('returns correct issuer information', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      const issuerInfo = contract.getIssuerInfo(issuerAccount)
      expect(issuerInfo.name.native).toBe('Test Issuer')
      expect(issuerInfo.url.native).toBe('https://example.com')
      expect(issuerInfo.isActive.native).toBe(true)
      expect(Number(issuerInfo.addedAt.native)).toBeGreaterThan(0)
    })

    it('throws error for non-existent issuer', () => {
      const contract = createContract()

      const issuerAccount = ctx.any.account()

      expect(() => {
        contract.getIssuerInfo(issuerAccount)
      }).toThrow('Issuer not found')
    })

    it('returns info for inactive issuer', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      contract.removeIssuer(issuerAccount)

      const issuerInfo = contract.getIssuerInfo(issuerAccount)
      expect(issuerInfo.isActive.native).toBe(false)
      expect(issuerInfo.name.native).toBe('Test Issuer')
    })
  })

  describe('transferAdmin', () => {
    it('allows admin to transfer admin rights', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const newAdminAccount = ctx.any.account()
      contract.transferAdmin(newAdminAccount)

      expect(contract.admin.value).toBe(newAdminAccount)
    })

    it('rejects non-admin attempts to transfer admin rights', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const nonAdminAccount = ctx.any.account()
      ctx.defaultSender = nonAdminAccount

      const newAdminAccount = ctx.any.account()
      expect(() => {
        contract.transferAdmin(newAdminAccount)
      }).toThrow('Only admin can transfer admin rights')
    })

    it('new admin can perform admin actions', () => {
      const adminAccount = ctx.any.account()
      ctx.defaultSender = adminAccount
      const contract = createContract()

      const newAdminAccount = ctx.any.account()
      contract.transferAdmin(newAdminAccount)

      ctx.defaultSender = newAdminAccount
      const issuerAccount = ctx.any.account()
      contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')

      expect(contract.issuerCount.value).toEqual(1)
    })

    it('old admin cannot perform admin actions after transfer', () => {
      const oldAdminAccount = ctx.any.account()
      ctx.defaultSender = oldAdminAccount
      const contract = createContract()

      const newAdminAccount = ctx.any.account()
      contract.transferAdmin(newAdminAccount)

      ctx.defaultSender = oldAdminAccount
      const issuerAccount = ctx.any.account()

      expect(() => {
        contract.addIssuer(issuerAccount, 'Test Issuer', 'https://example.com')
      }).toThrow('Only admin can add issuers')
    })
  })
})
