import { httpError } from '../../lib/http.js';

export function createCustomerServices({ customerRepository, jobRepository, teamMemberRepository }) {
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
        .sort((left, right) => {
          if (left.scheduleState !== right.scheduleState) {
            return left.scheduleState === 'scheduled' ? -1 : 1;
          }
          if (left.scheduleState === 'scheduled') {
            return new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime();
          }
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        })
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
      const merged = { ...existing, ...patch };
      if (!merged.displayName && !merged.firstName) {
        throw httpError(400, 'CUSTOMER_IDENTITY_REQUIRED', 'Customer requires either displayName or firstName');
      }
      const updated = customerRepository.update(customerId, merged);
      return updated;
    },
  };
}

function formatAddressSummary(address) {
  if (!address) return null;
  return [address.street, address.city, address.state].filter(Boolean).join(', ');
}
