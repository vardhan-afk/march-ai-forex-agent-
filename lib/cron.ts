import cron from 'node-cron';
import { refreshCalendar, refreshNews, refreshPrices, refreshSpeeches } from './fetchers';

export function startCronJobs() {
  refreshCalendar().catch(err => console.error('Initial calendar fetch failed:', err));
  refreshNews().catch(err => console.error('Initial news fetch failed:', err));
  refreshPrices().catch(err => console.error('Initial price fetch failed:', err));
  refreshSpeeches().catch(err => console.error('Initial speeches fetch failed:', err));

  cron.schedule('*/10 * * * *', () => {
    refreshCalendar().catch(err => console.error('Calendar refresh failed:', err));
  });

  cron.schedule('*/2 * * * *', () => {
    refreshNews().catch(err => console.error('News refresh failed:', err));
  });

  cron.schedule('*/1 * * * *', () => {
    refreshPrices().catch(err => console.error('Price refresh failed:', err));
  });

  cron.schedule('*/30 * * * *', () => {
    refreshSpeeches().catch(err => console.error('Speeches refresh failed:', err));
  });
}