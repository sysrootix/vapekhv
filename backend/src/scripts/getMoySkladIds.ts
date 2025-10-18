import { MoySkladAPI } from '../services/moysklad.api';
import { logger } from '../config/logger';

async function getMoySkladIds() {
  const moySkladAPI = new MoySkladAPI();

  try {
    logger.info('Fetching MoySklad Organizations...');
    const accountInfo = await moySkladAPI.getAccountInfo();
    if (accountInfo && accountInfo.context && accountInfo.context.employee && accountInfo.context.employee.organization) {
      const orgMeta = accountInfo.context.employee.organization.meta;
      const orgId = orgMeta.href.split('/').pop();
      logger.info(`Found Organization ID: ${orgId}`);
      logger.info(`Organization Name: ${accountInfo.context.employee.organization.name}`);
      logger.info(`Organization Meta Href: ${orgMeta.href}`);
    } else {
      logger.warn('Could not find Organization ID from account info. You might need to manually find it in MoySklad.');
    }

    logger.info('\nFetching MoySklad Counterparties (first 100)...');
    // MoySkladAPI does not have a direct method to get all counterparties.
    // We'll use a direct client call for this.
    const response = await moySkladAPI['client'].get('/entity/counterparty', {
      params: {
        limit: 100,
      },
    });

    if (response.data && response.data.rows && response.data.rows.length > 0) {
      logger.info('Available Counterparties:');
      response.data.rows.forEach((counterparty: any) => {
        logger.info(`  ID: ${counterparty.id}, Name: ${counterparty.name}, Phone: ${counterparty.phone || 'N/A'}`);
      });
      logger.info('Please choose a Counterparty ID from the list above or create a new one in MoySklad.');
    } else {
      logger.warn('No Counterparties found. You might need to create one in MoySklad.');
    }

  } catch (error) {
    logger.error('Error fetching MoySklad IDs:', error);
  }
}

getMoySkladIds();
