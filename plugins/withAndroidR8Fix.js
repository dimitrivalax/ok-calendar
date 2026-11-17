const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const PROGUARD_RULES = `
# Room / WorkManager (expo-background-task): keep default constructor and DAO methods in R8 full mode (AGP 9+)
-keep class * extends androidx.room.RoomDatabase {
  public <init>();
  *;
}
-keep class * extends androidx.room.RoomOpenHelper$Delegate { *; }

# Keep Expo autolinking package list accessed via reflection
-keep class expo.modules.ExpoModulesPackageList { *; }
`;

module.exports = function withAndroidR8Fix(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const proguardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
      if (fs.existsSync(proguardPath)) {
        const current = fs.readFileSync(proguardPath, 'utf8');
        if (!current.includes('androidx.room.RoomDatabase')) {
          fs.writeFileSync(
            proguardPath,
            `${current.trimEnd()}\n${PROGUARD_RULES}`,
            'utf8',
          );
        }
      }
      return modConfig;
    },
  ]);
};

