import { useEffect, useState } from "react";
import { Platform, ScrollView, TextInput } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { set } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  useChangeLocale,
  useRequestPermissions,
  useSyncNow,
  useToggleCalendarVisibility,
  useUpdateDigestSetting,
} from "@/hooks/mutations/useCalendarMutations";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useCalendars } from "@/hooks/queries/useCalendars";
import {
  DEFAULT_DIGEST_SETTINGS,
  useBackgroundSyncStatus,
  useDigestSettings,
} from "@/hooks/queries/useSettingsQueries";
import {
  useThemePreference,
  type ThemePreference,
} from "@/hooks/useThemePreference";
import type { LocalePreference } from "@/i18n";
import { queryClient } from "@/lib/queryClient";
import { CalendarService } from "@/services/calendarDevice";
import {
  parseDigestTime,
  parseTomorrowDigestTime,
} from "@/services/dailyDigest";
import {
  useIsLocalOnly,
  useLocalePreference,
} from "@/state/calendarStore";
import packageJson from "../../../package.json";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const LOCALE_OPTIONS: LocalePreference[] = ["system", "en", "fr"];

function timeToDate(hours: number, minutes: number): Date {
  return set(new Date(), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation(["settings", "calendar", "common"]);
  const localePreference = useLocalePreference();
  const isLocalOnly = useIsLocalOnly();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const { data: calendars = [] } = useCalendars();
  const { data: digestSettings = DEFAULT_DIGEST_SETTINGS } =
    useDigestSettings();
  const { data: bgSyncActive = false } = useBackgroundSyncStatus();
  const changeLocale = useChangeLocale();
  const requestPermissions = useRequestPermissions();
  const syncNow = useSyncNow();
  const toggleCalendarVisibility = useToggleCalendarVisibility();
  const updateDigestSetting = useUpdateDigestSetting();

  const {
    digestEnabled,
    digestTime,
    tomorrowDigestEnabled,
    tomorrowDigestTime,
  } = digestSettings;

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTomorrowTimePicker, setShowTomorrowTimePicker] = useState(false);

  useEffect(() => {
    void CalendarService.syncDeviceCalendarsIntoDb().then(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all }),
    );
  }, []);

  const persistDigestEnabled = (next: boolean) => {
    updateDigestSetting.mutate({ kind: "dailyEnabled", enabled: next });
  };

  const persistDigestTime = (hours: number, minutes: number) => {
    updateDigestSetting.mutate({ kind: "dailyTime", hours, minutes });
  };

  const persistTomorrowDigestEnabled = (next: boolean) => {
    updateDigestSetting.mutate({ kind: "tomorrowEnabled", enabled: next });
  };

  const persistTomorrowDigestTime = (hours: number, minutes: number) => {
    updateDigestSetting.mutate({ kind: "tomorrowTime", hours, minutes });
  };

  const onAndroidTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    persistDigestTime(selected.getHours(), selected.getMinutes());
  };

  const onAndroidTomorrowTimeChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setShowTomorrowTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    persistTomorrowDigestTime(selected.getHours(), selected.getMinutes());
  };

  const digestDate = (() => {
    const { hours, minutes } = parseDigestTime(digestTime);
    return timeToDate(hours, minutes);
  })();

  const tomorrowDigestDate = (() => {
    const { hours, minutes } = parseTomorrowDigestTime(tomorrowDigestTime);
    return timeToDate(hours, minutes);
  })();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <VStack className="gap-6">
        <Text size="xl" bold>
          {t("settings:title")}
        </Text>

        <VStack className="gap-2">
          <Text bold>{t("settings:language")}</Text>
          <HStack className="gap-2 flex-wrap" testID="settings-locale">
            {LOCALE_OPTIONS.map((code) => (
              <Button
                key={code}
                variant={localePreference === code ? "default" : "outline"}
                onPress={() => changeLocale.mutate(code)}
                testID={`locale-${code}`}
              >
                <ButtonText>
                  {code === "system"
                    ? t("settings:languageSystem")
                    : code === "en"
                      ? t("settings:languageEn")
                      : t("settings:languageFr")}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t("settings:theme")}</Text>
          <HStack className="gap-2 flex-wrap" testID="settings-theme">
            {THEME_OPTIONS.map((mode) => (
              <Button
                key={mode}
                variant={preference === mode ? "default" : "outline"}
                onPress={() => setPreference(mode)}
                testID={`theme-${mode}`}
              >
                <ButtonText>
                  {mode === "system"
                    ? t("settings:themeSystem")
                    : mode === "light"
                      ? t("settings:themeLight")
                      : t("settings:themeDark")}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>

        <VStack className="gap-2" testID="settings-daily-digest">
          <HStack className="items-center justify-between">
            <VStack className="flex-1 pr-3 gap-1">
              <Text bold>{t("settings:dailyDigest")}</Text>
              <Text size="xs" className="text-muted-foreground">
                {t("settings:dailyDigestHint")}
              </Text>
            </VStack>
            <Switch
              value={digestEnabled}
              onValueChange={(value: boolean) => {
                void persistDigestEnabled(value);
              }}
              accessibilityLabel={t("settings:dailyDigest")}
              testID="daily-digest-enabled"
            />
          </HStack>
          {digestEnabled ? (
            <VStack className="gap-1">
              <Text>{t("settings:dailyDigestTime")}</Text>
              {Platform.OS === "web" ? (
                <TextInput
                  accessibilityLabel={t("settings:dailyDigestTime")}
                  className="min-h-9 w-32 rounded-md border border-border px-3 py-1 text-sm text-foreground"
                  // @ts-expect-error web-only input type
                  type="time"
                  value={digestTime}
                  onChangeText={(raw) => {
                    if (!raw) return;
                    const parsed = parseDigestTime(raw);
                    void persistDigestTime(parsed.hours, parsed.minutes);
                  }}
                  testID="daily-digest-time"
                />
              ) : Platform.OS === "ios" ? (
                <DateTimePicker
                  value={digestDate}
                  mode="time"
                  display="compact"
                  locale={i18n.language}
                  onChange={(_event, selected) => {
                    if (!selected) return;
                    void persistDigestTime(
                      selected.getHours(),
                      selected.getMinutes(),
                    );
                  }}
                  testID="daily-digest-time"
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowTimePicker(true)}
                    testID="daily-digest-time"
                  >
                    <ButtonText>{digestTime}</ButtonText>
                  </Button>
                  {showTimePicker ? (
                    <DateTimePicker
                      value={digestDate}
                      mode="time"
                      display="default"
                      onChange={onAndroidTimeChange}
                    />
                  ) : null}
                </>
              )}
            </VStack>
          ) : null}
        </VStack>

        <VStack className="gap-2" testID="settings-tomorrow-digest">
          <HStack className="items-center justify-between">
            <VStack className="flex-1 pr-3 gap-1">
              <Text bold>{t("settings:tomorrowDigest")}</Text>
              <Text size="xs" className="text-muted-foreground">
                {t("settings:tomorrowDigestHint")}
              </Text>
            </VStack>
            <Switch
              value={tomorrowDigestEnabled}
              onValueChange={(value: boolean) => {
                void persistTomorrowDigestEnabled(value);
              }}
              accessibilityLabel={t("settings:tomorrowDigest")}
              testID="tomorrow-digest-enabled"
            />
          </HStack>
          {tomorrowDigestEnabled ? (
            <VStack className="gap-1">
              <Text>{t("settings:tomorrowDigestTime")}</Text>
              {Platform.OS === "web" ? (
                <TextInput
                  accessibilityLabel={t("settings:tomorrowDigestTime")}
                  className="min-h-9 w-32 rounded-md border border-border px-3 py-1 text-sm text-foreground"
                  // @ts-expect-error web-only input type
                  type="time"
                  value={tomorrowDigestTime}
                  onChangeText={(raw) => {
                    if (!raw) return;
                    const parsed = parseTomorrowDigestTime(raw);
                    void persistTomorrowDigestTime(
                      parsed.hours,
                      parsed.minutes,
                    );
                  }}
                  testID="tomorrow-digest-time"
                />
              ) : Platform.OS === "ios" ? (
                <DateTimePicker
                  value={tomorrowDigestDate}
                  mode="time"
                  display="compact"
                  locale={i18n.language}
                  onChange={(_event, selected) => {
                    if (!selected) return;
                    void persistTomorrowDigestTime(
                      selected.getHours(),
                      selected.getMinutes(),
                    );
                  }}
                  testID="tomorrow-digest-time"
                />
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowTomorrowTimePicker(true)}
                    testID="tomorrow-digest-time"
                  >
                    <ButtonText>{tomorrowDigestTime}</ButtonText>
                  </Button>
                  {showTomorrowTimePicker ? (
                    <DateTimePicker
                      value={tomorrowDigestDate}
                      mode="time"
                      display="default"
                      onChange={onAndroidTomorrowTimeChange}
                    />
                  ) : null}
                </>
              )}
            </VStack>
          ) : null}
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t("settings:permissions")}</Text>
          <Text>
            {t("settings:calendarPermission")}:{" "}
            {isLocalOnly ? t("settings:denied") : t("settings:granted")}
          </Text>
          <Button
            variant="outline"
            disabled={requestPermissions.isPending}
            onPress={() => requestPermissions.mutate()}
          >
            <ButtonText>{t("settings:permissions")}</ButtonText>
          </Button>
        </VStack>

        <VStack className="gap-2">
          <Text bold>{t("settings:sync")}</Text>
          <Text size="sm" className="text-muted-foreground">
            {t("settings:backgroundSync")}:{" "}
            {bgSyncActive
              ? t("settings:backgroundSyncAvailable")
              : t("settings:backgroundSyncRestricted")}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            {t("settings:backgroundSyncHint")}
          </Text>
          <Button
            disabled={syncNow.isPending}
            onPress={() => syncNow.mutate()}
            testID="btn-sync-now"
          >
            <ButtonText>{t("calendar:syncNow")}</ButtonText>
          </Button>
        </VStack>

        <VStack className="gap-2" testID="calendar-list">
          <Text bold>{t("calendar:calendars")}</Text>
          {calendars.map((item) => (
            <HStack
              key={item.id}
              className="items-center justify-between py-3 border-b border-border"
            >
              <HStack className="items-center gap-2 flex-1">
                <Box
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <VStack className="flex-1">
                  <Text>{item.title}</Text>
                  <Text size="xs" className="text-muted-foreground">
                    {item.source}
                    {!item.allowsModifications ? " · read-only" : ""}
                  </Text>
                </VStack>
              </HStack>
              <Switch
                value={item.isVisible}
                accessibilityLabel={t("calendar:toggleCalendarVisibility", {
                  title: item.title,
                })}
                onValueChange={(value: boolean) => {
                  toggleCalendarVisibility.mutate({
                    id: item.id,
                    isVisible: value,
                  });
                }}
              />
            </HStack>
          ))}
        </VStack>

        <Text
          size="xs"
          className="text-center text-muted-foreground pt-2"
          testID="settings-version"
        >
          {t("settings:version", { version: packageJson.version })}
        </Text>
      </VStack>
    </ScrollView>
  );
}
