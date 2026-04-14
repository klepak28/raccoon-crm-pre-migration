import { httpError } from '../../lib/http.js';
import { compareJobsForOperations } from '../../domain/jobs/job-ordering.js';

export function createCustomerServices({ customerRepository, jobRepository, teamMemberRepository }) {
  return {
    createCustomer(input) {
      return customerRepository.create(applyCustomerInvariants(input));
    },
    listCustomers() {
      return customerRepository.list().map((customer) => ({
        id: customer.id,
        displayName: customer.displayName,
        customerType: customer.customerType,
        doNotService: customer.doNotService,
        tags: customer.tags,
        createdAt: customer.createdAt,
        primaryPhone: customer.phones[0]?.value || null,
        primaryEmail: customer.emails[0]?.value || null,
        primaryAddressSummary: formatAddressSummary(customer.addresses[0]),
      }));
    },
    getCustomerDetail(customerId) {
      const customer = customerRepository.getById(customerId);
      if (!customer) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      const jobs = jobRepository
        .listByCustomerId(customerId)
        .sort(compareJobsForOperations)
        .map((job) => ({
          id: job.id,
          jobNumber: job.jobNumber,
          titleOrServiceSummary: job.titleOrServiceSummary,
          scheduleState: job.scheduleState,
          scheduledStartAt: job.scheduledStartAt,
          scheduledEndAt: job.scheduledEndAt,
          assigneeTeamMemberId: job.assigneeTeamMemberId,
          assigneeDisplayName: job.assigneeTeamMemberId
            ? teamMemberRepository.getById(job.assigneeTeamMemberId)?.displayName || job.assigneeTeamMemberId
            : null,
          address: customer.addresses.find((item) => item.id === job.customerAddressId) || null,
        }));
      return { ...customer, jobs };
    },
    // patch contains only the fields explicitly provided in the request body.
    // Omitted fields are preserved from the stored customer record.
    updateCustomerBasic(customerId, patch) {
      const existing = customerRepository.getById(customerId);
      if (!existing) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      const merged = applyCustomerInvariants({ ...existing, ...patch });
      merged.displayName = deriveDisplayName(merged);
      if (!merged.displayName && !merged.firstName) {
        throw httpError(400, 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires either displayName or firstName');
      }
      const updated = customerRepository.update(customerId, merged);
      return updated;
    },
  };
}

function applyCustomerInvariants(customer) {
  customer.displayName = customer.displayName || deriveDisplayName(customer);
  if (customer.doNotService) {
    customer.sendNotifications = false;
  }
  return customer;
}

function deriveDisplayName(customer) {
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return person || customer.companyName || customer.displayName || '';
}

function formatAddressSummary(address) {
  if (!address) return null;
  return [address.street, address.city, address.state].filter(Boolean).join(', ');
}
