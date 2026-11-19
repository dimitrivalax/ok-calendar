import { useTranslation } from 'react-i18next';

import { OccurrenceList } from '@/components/calendar/OccurrenceList';
import { useCalendar } from '@/hooks/useCalendarContext';

export function AgendaView() {
  const { occurrences } = useCalendar();
  const { t } = useTranslation(['calendar']);

  return (
    <OccurrenceList
      occurrences={occurrences}
      emptyMessage={t('calendar:noEvents')}
      testID="panel-agenda"
    />
  );
}
