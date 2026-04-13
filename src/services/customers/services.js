import { httpError } from '../../lib/http.js';

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
    updateCustomerBasic(customerId, input) {
      const updated = customerRepository.update(customerId, input);
      if (!updated) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      }
      return updated;
    },
  };
}
