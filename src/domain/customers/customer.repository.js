function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCustomerRepository(store) {
  return {
    create(input) {
      const timestamp = new Date().toISOString();
      const customer = {
        id: store.nextCustomerId(),
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: input.displayName,
        companyName: input.companyName,
        role: input.role,
        customerType: input.customerType,
        subcontractor: input.subcontractor,
        doNotService: input.doNotService,
        sendNotifications: input.sendNotifications,
        customerNotes: input.customerNotes,
        leadSource: input.leadSource,
        referredBy: input.referredBy,
        tags: input.tags,
        createdAt: timestamp,
        updatedAt: timestamp,
        addresses: input.addresses.map((address) => ({
          id: store.nextAddressId(),
          ...address,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
        phones: input.phones.map((phone) => ({
          id: store.nextPhoneId(),
          ...phone,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
        emails: input.emails.map((email) => ({
          id: store.nextEmailId(),
          ...email,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      };
      store.customers.push(customer);
      return clone(customer);
    },
    update(customerId, input) {
      const customer = store.customers.find((item) => item.id === customerId);
      if (!customer) return null;
      customer.firstName = input.firstName;
      customer.lastName = input.lastName;
      customer.displayName = input.displayName;
      customer.companyName = input.companyName;
      customer.role = input.role;
      customer.customerType = input.customerType;
      customer.subcontractor = input.subcontractor;
      customer.doNotService = input.doNotService;
      customer.sendNotifications = input.sendNotifications;
      customer.customerNotes = input.customerNotes;
      customer.leadSource = input.leadSource;
      customer.referredBy = input.referredBy;
      customer.tags = input.tags;
      customer.addresses = input.addresses.map((address) => ({
        id: store.nextAddressId(),
        ...address,
        createdAt: customer.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      customer.phones = input.phones.map((phone) => ({
        id: store.nextPhoneId(),
        ...phone,
        createdAt: customer.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      customer.emails = input.emails.map((email) => ({
        id: store.nextEmailId(),
        ...email,
        createdAt: customer.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      customer.updatedAt = new Date().toISOString();
      return clone(customer);
    },
    list() {
      return clone(store.customers);
    },
    getById(customerId) {
      const customer = store.customers.find((item) => item.id === customerId);
      return customer ? clone(customer) : null;
    },
  };
}
