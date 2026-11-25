import { useTranslation } from 'react-i18next';

import { OccurrenceList } from '@/components/calendar/OccurrenceList';
import { useCalendarOccurrences } from '@/hooks/queries/useEventsInRange';

export function AgendaView() {
  const occurrences = useCalendarOccurrences();
  const { t } = useTranslation(['calendar']);

  return (
    <OccurrenceList
      occurrences={occurrences}
      emptyMessage={t('calendar:noEvents')}
      testID="panel-agenda"
    />
  );
}
