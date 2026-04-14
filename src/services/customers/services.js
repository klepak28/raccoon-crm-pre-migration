import { httpError } from '../../lib/http.js';
import { validateCustomerInput } from '../../validation/customers/customer-input.validator.js';

export function createCustomerServices({ customerRepository, jobRepository }) {
  return {
    createCustomer(input) {
      return customerRepository.create(input);
    },
    listCustomers() {
      return customerRepository.list().map((customer) => ({
        id: customer.id,
        displayName: customer.displayName,
        customerType: customer.customerType,
        doNotService: customer.doNotService,
        tags: customer.tags,
        createdAt: customer.createdAt,
      }));
    },
    getCustomerDetail(customerId) {
      const customer = customerRepository.getById(customerId);
      if (!customer) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      const jobs = jobRepository.listByCustomerId(customerId).map((job) => ({
        id: job.id,
        jobNumber: job.jobNumber,
        titleOrServiceSummary: job.titleOrServiceSummary,
        scheduleState: job.scheduleState,
        scheduledStartAt: job.scheduledStartAt,
        scheduledEndAt: job.scheduledEndAt,
        assigneeTeamMemberId: job.assigneeTeamMemberId,
      }));
      return { ...customer, jobs };
    },
    updateCustomerBasic(customerId, patch) {
      const existing = customerRepository.getById(customerId);
      if (!existing) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }

      const merged = buildMergedCustomerUpdate(existing, patch);
      const validated = validateCustomerInput(merged);
      const updated = customerRepository.update(customerId, validated);
      if (!updated) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return updated;
    },
  };
}

function buildMergedCustomerUpdate(existing, patch) {
  return {
    firstName: patch.firstName ?? existing.firstName,
    lastName: patch.lastName ?? existing.lastName,
    displayName: patch.displayName ?? existing.displayName,
    companyName: patch.companyName ?? existing.companyName,
    role: patch.role ?? existing.role,
    customerType: patch.customerType ?? existing.customerType,
    subcontractor: patch.subcontractor ?? existing.subcontractor,
    doNotService: patch.doNotService ?? existing.doNotService,
    sendNotifications: patch.sendNotifications ?? existing.sendNotifications,
    customerNotes: patch.customerNotes ?? existing.customerNotes,
    leadSource: patch.leadSource ?? existing.leadSource,
    referredBy: patch.referredBy ?? existing.referredBy,
    tags: patch.tags ?? existing.tags,
    additionalPhones: normalizePhonesForInput(patch.phones ?? existing.phones),
    additionalEmails: normalizeEmailsForInput(patch.emails ?? existing.emails),
    additionalAddresses: normalizeAddressesForInput(patch.addresses ?? existing.addresses),
  };
}

function normalizePhonesForInput(phones) {
  return (phones || []).map((phone) => ({
    value: phone.value,
    note: phone.note,
    type: phone.type,
  }));
}

function normalizeEmailsForInput(emails) {
  return (emails || []).map((email) => ({ value: email.value }));
}

function normalizeAddressesForInput(addresses) {
  return (addresses || []).map((address) => ({
    street: address.street,
    unit: address.unit,
    city: address.city,
    state: address.state,
    zip: address.zip,
    notes: address.notes,
  }));
}
