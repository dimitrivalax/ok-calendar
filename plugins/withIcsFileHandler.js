const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

const ICS_MIME_TYPES = [
  'text/calendar',
  'application/ics',
  'text/x-vcalendar',
];

const ICS_PATH_PATTERNS = [
  '.*\\.ics',
  '.*\\..*\\.ics',
  '.*\\..*\\..*\\.ics',
  '.*\\.ICS',
];

function createViewFilter(dataEntries) {
  return {
    action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
    category: [
      { $: { 'android:name': 'android.intent.category.DEFAULT' } },
      { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
    ],
    data: dataEntries.map((attrs) => ({ $: attrs })),
  };
}

function hasIcsIntentFilter(intentFilters) {
  return intentFilters.some((filter) =>
    (filter.data ?? []).some(
      (entry) => entry.$?.['android:mimeType'] === 'text/calendar',
    ),
  );
}

function withAndroidIcsHandler(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) return modConfig;

    const activities = application.activity ?? [];
    const mainActivity =
      activities.find((a) => a.$?.['android:name'] === '.MainActivity') ??
      activities[0];
    if (!mainActivity) return modConfig;

    mainActivity['intent-filter'] = mainActivity['intent-filter'] ?? [];
    if (hasIcsIntentFilter(mainActivity['intent-filter'])) {
      return modConfig;
    }

    // 1. MIME-type match (covers content:// URIs without .ics suffix, e.g. Gmail / Doctolib)
    mainActivity['intent-filter'].push(
      createViewFilter([
        { 'android:scheme': 'content' },
        { 'android:scheme': 'file' },
        ...ICS_MIME_TYPES.map((mimeType) => ({ 'android:mimeType': mimeType })),
      ]),
    );

    // 2. Extension match with generic MIME (e.g. application/octet-stream from Downloads)
    mainActivity['intent-filter'].push(
      createViewFilter([
        { 'android:scheme': 'content' },
        { 'android:scheme': 'file' },
        { 'android:host': '*' },
        { 'android:mimeType': '*/*' },
        ...ICS_PATH_PATTERNS.map((pattern) => ({
          'android:pathPattern': pattern,
        })),
      ]),
    );

    // 3. Extension match when no MIME type is supplied on the Intent
    mainActivity['intent-filter'].push(
      createViewFilter([
        { 'android:scheme': 'content' },
        { 'android:scheme': 'file' },
        { 'android:host': '*' },
        ...ICS_PATH_PATTERNS.map((pattern) => ({
          'android:pathPattern': pattern,
        })),
      ]),
    );

    return modConfig;
  });
}

function withIosIcsHandler(config) {
  return withInfoPlist(config, (modConfig) => {
    const plist = modConfig.modResults;
    const docTypes = Array.isArray(plist.CFBundleDocumentTypes)
      ? plist.CFBundleDocumentTypes
      : [];

    const alreadyRegistered = docTypes.some(
      (entry) =>
        Array.isArray(entry.LSItemContentTypes) &&
        entry.LSItemContentTypes.includes('com.apple.ical.ics'),
    );

    if (!alreadyRegistered) {
      docTypes.push({
        CFBundleTypeName: 'iCalendar Event',
        LSHandlerRank: 'Alternate',
        LSItemContentTypes: ['com.apple.ical.ics'],
      });
    }

    plist.CFBundleDocumentTypes = docTypes;
    // Copy incoming .ics files into Documents/Inbox so the app can read them without security-scoped access.
    plist.LSSupportsOpeningDocumentsInPlace = false;

    return modConfig;
  });
}

module.exports = function withIcsFileHandler(config) {
  return withIosIcsHandler(withAndroidIcsHandler(config));
};
